// Root ESLint config (ESLint 8, legacy .eslintrc format).
// Google style rules for logic; Prettier owns formatting.
// functions/ has its own config (functions/.eslintrc.js) and is linted
// separately, so it is ignored here (see .eslintignore).
//
// Layout:
//   1. Messages     – the text developers see when a rule fires
//   2. JS rules     – XSS / code-injection rules for every .js file
//   3. HTML rules   – the same ideas, applied to .html markup
//   4. Config       – which files get which rules

// ---------------------------------------------------------------------------
// 1. Messages
// ---------------------------------------------------------------------------

const HTML_INJECTION =
  'parses a string as HTML (XSS risk). Use textContent, createElement() and append() instead.';
const ATTR_INJECTION =
  'on* attributes run a string as code and srcdoc parses one as HTML (XSS risk). Use addEventListener() or DOM methods instead.';

// ---------------------------------------------------------------------------
// 2. JS rules
// ---------------------------------------------------------------------------

// DOM properties and methods that turn a string into HTML. Banned by name on
// any object, including el['innerHTML'] and destructuring.
const HTML_PARSING_APIS = [
  'innerHTML',
  'outerHTML',
  'insertAdjacentHTML',
  'createContextualFragment',
  'parseFromString',
  'setHTMLUnsafe',
  'parseHTMLUnsafe',
  'srcdoc',
  'execCommand',
];

// Attribute names whose value runs as code (onclick, onerror, ...) or is
// parsed as an HTML document (srcdoc). Case-insensitive.
const CODE_ATTR_NAME = '/^(on|srcdoc$)/i';

// Object keys that end up assigned as HTML.
const HTML_KEY = '/^(innerHTML|outerHTML|srcdoc)$/';

// AST selectors for injection paths a property name alone can't express.
// Each is a CSS-like query over the parsed code.
const selectors = {
  // document.write(...) / writeln(...), also via window.document.
  documentWrite:
    'MemberExpression[property.name=/^(write|writeln)$/]' +
    ":matches([object.name='document'], [object.property.name='document'])",

  // el.<method>(...) where the argument at nameIndex is a string literal
  // naming a code attribute, e.g. setAttribute('onclick', str).
  // Normal calls like setAttribute('class', x) are not affected.
  setCodeAttribute: (method, nameIndex) =>
    `CallExpression[callee.property.name='${method}']` +
    `[arguments.${nameIndex}.value=${CODE_ATTR_NAME}]`,

  // {innerHTML: str} or {'innerHTML': str}, e.g. Object.assign(el, {...}).
  htmlObjectKey:
    `ObjectExpression > Property[key.name=${HTML_KEY}], ` +
    `ObjectExpression > Property[key.value=${HTML_KEY}]`,
};

// Rules shared by every JavaScript file in the repo.
const jsRules = {
  eqeqeq: ['error', 'always'],

  // Running strings as code.
  'no-eval': 'error', // eval('...')
  'no-implied-eval': 'error', // setTimeout('...')
  'no-new-func': 'error', // new Function('...')
  'no-script-url': 'error', // a.href = 'javascript:...'

  // Parsing strings as HTML.
  'no-restricted-properties': [
    'error',
    ...HTML_PARSING_APIS.map((property) => ({
      property,
      message: `${property} ${HTML_INJECTION}`,
    })),
  ],
  'no-restricted-syntax': [
    'error',
    {
      selector: selectors.documentWrite,
      message: `document.write() ${HTML_INJECTION}`,
    },
    {
      selector: selectors.setCodeAttribute('setAttribute', 0),
      message: ATTR_INJECTION,
    },
    {
      // setAttributeNS(namespace, name, value): the name is argument 1.
      selector: selectors.setCodeAttribute('setAttributeNS', 1),
      message: ATTR_INJECTION,
    },
    {
      selector: selectors.htmlObjectKey,
      message: `This key ${HTML_INJECTION}`,
    },
  ],
};

// One override block for a group of JS files. Only the files, environment and
// module type differ between groups; the style presets and rules are shared.
const jsOverride = ({files, env, sourceType}) => ({
  files,
  env: {...env, es2022: true},
  parserOptions: {sourceType},
  extends: ['eslint:recommended', 'google', 'prettier'],
  rules: jsRules,
});

// ---------------------------------------------------------------------------
// 3. HTML rules
// ---------------------------------------------------------------------------

// html-eslint patterns are plain strings with no way to pass the `i` flag,
// so case-insensitivity is spelled out per letter: anyCase('on') -> '[oO][nN]'.
const anyCase = (word) =>
  [...word].map((c) => `[${c.toLowerCase()}${c.toUpperCase()}]`).join('');

// Formatting rules Prettier already handles.
const HTML_FORMATTING_RULES = [
  'indent',
  'quotes',
  'attrs-newline',
  'element-newline',
  'no-extra-spacing-tags',
  'require-closing-tags',
];

const htmlRules = {
  ...Object.fromEntries(
    HTML_FORMATTING_RULES.map((rule) => [`@html-eslint/${rule}`, 'off']),
  ),

  // No inline event handlers (onclick="...", any case) and no srcdoc.
  '@html-eslint/no-restricted-attrs': [
    'error',
    {
      tagPatterns: ['.*'],
      attrPatterns: [`^${anyCase('on')}`, `^${anyCase('srcdoc')}$`],
      message:
        'Inline event handlers and srcdoc are not allowed. Attach listeners with addEventListener() in a .js file.',
    },
  ],

  // No javascript: URLs in links, forms, frames or images.
  '@html-eslint/no-restricted-attr-values': [
    'error',
    {
      attrPatterns: ['^(href|src|action|formaction|xlink:href|data)$'],
      attrValuePatterns: [`^\\s*${anyCase('javascript')}:`],
      message: 'URLs that start with javascript: are not allowed.',
    },
  ],

  // No inline JavaScript: every <script> must load an external file.
  'no-restricted-syntax': [
    'error',
    {
      selector: "ScriptTag:not(:has(AttributeKey[value='src']))",
      message:
        'Inline <script> is not allowed. Move the code to a .js file and load it with <script type="module" src="...">.',
    },
  ],
};

// ---------------------------------------------------------------------------
// 4. Config
// ---------------------------------------------------------------------------

module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 'latest',
  },
  overrides: [
    // Root-level tooling config files (this file, etc.): Node CommonJS.
    // In ESLint 8 a pattern with no slash matches in every folder, so this
    // block also applies to js/ and tests/. Later blocks replace single
    // values (sourceType) but env is merged key by key, so js/ must set
    // node: false explicitly to drop the Node globals added here.
    jsOverride({
      files: ['*.js', '*.cjs'],
      env: {node: true},
      sourceType: 'script',
    }),

    // Frontend: browser ES modules.
    jsOverride({
      files: ['js/**/*.js'],
      env: {browser: true, node: false},
      sourceType: 'module',
    }),

    // Firestore rules tests: Node, using node:test and
    // @firebase/rules-unit-testing.
    jsOverride({
      files: ['tests/**/*.js'],
      env: {node: true},
      sourceType: 'module',
    }),

    // HTML pages. Prettier formats them, so only correctness and
    // accessibility rules stay on.
    {
      files: ['*.html', '**/*.html'],
      parser: '@html-eslint/parser',
      plugins: ['@html-eslint'],
      extends: ['plugin:@html-eslint/recommended-legacy'],
      rules: htmlRules,
    },
  ],
};
