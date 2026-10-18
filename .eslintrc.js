// Root ESLint config (ESLint 8, legacy .eslintrc format).
// Google style rules for logic; Prettier owns formatting.
// functions/ has its own config (functions/.eslintrc.js) and is linted
// separately, so it is ignored here (see .eslintignore).

// Rules shared by every JavaScript file in the repo.
const HTML_INJECTION =
  'parses a string as HTML (XSS risk). Use textContent, createElement() and append() instead.';
const ATTR_INJECTION =
  'on* attributes run a string as code and srcdoc parses one as HTML (XSS risk). Use addEventListener() or DOM methods instead.';

const securityRules = {
  eqeqeq: ['error', 'always'],
  'no-eval': 'error',
  'no-implied-eval': 'error',
  'no-new-func': 'error',
  // Flags string literals that start with "javascript:" (e.g. a.href = ...).
  'no-script-url': 'error',

  // Every DOM property or method that turns a string into HTML.
  // Matched by name on any object, including el['innerHTML'] and
  // destructuring.
  'no-restricted-properties': [
    'error',
    ...[
      'innerHTML',
      'outerHTML',
      'insertAdjacentHTML',
      'createContextualFragment',
      'parseFromString',
      'setHTMLUnsafe',
      'parseHTMLUnsafe',
      'srcdoc',
      'execCommand',
    ].map((property) => ({property, message: `${property} ${HTML_INJECTION}`})),
  ],

  // Injection paths that a property name alone can't express.
  'no-restricted-syntax': [
    'error',
    {
      // document.write / writeln, also via window.document.
      selector:
        "MemberExpression[property.name=/^(write|writeln)$/]:matches([object.name='document'], [object.property.name='document'])",
      message: `document.write() ${HTML_INJECTION}`,
    },
    {
      // setAttribute('onclick', str) / setAttribute('srcdoc', str).
      selector:
        "CallExpression[callee.property.name='setAttribute'][arguments.0.value=/^(on|srcdoc$)/i]",
      message: ATTR_INJECTION,
    },
    {
      selector:
        "CallExpression[callee.property.name='setAttributeNS'][arguments.1.value=/^(on|srcdoc$)/i]",
      message: ATTR_INJECTION,
    },
    {
      // Object.assign(el, {innerHTML: str}) and similar.
      selector:
        'ObjectExpression > Property[key.name=/^(innerHTML|outerHTML|srcdoc)$/], ObjectExpression > Property[key.value=/^(innerHTML|outerHTML|srcdoc)$/]',
      message: `This key ${HTML_INJECTION}`,
    },
  ],
};

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
    {
      files: ['*.js', '*.cjs'],
      env: {node: true, es2022: true},
      parserOptions: {sourceType: 'script'},
      extends: ['eslint:recommended', 'google', 'prettier'],
      rules: securityRules,
    },

    // Frontend: browser ES modules (js/**).
    {
      files: ['js/**/*.js'],
      env: {browser: true, node: false, es2022: true},
      parserOptions: {sourceType: 'module'},
      extends: ['eslint:recommended', 'google', 'prettier'],
      rules: securityRules,
    },

    // Firestore rules tests: Node, using node:test and
    // @firebase/rules-unit-testing.
    {
      files: ['tests/**/*.js'],
      env: {node: true, es2022: true},
      parserOptions: {sourceType: 'module'},
      extends: ['eslint:recommended', 'google', 'prettier'],
      rules: securityRules,
    },

    // HTML pages. Prettier formats them, so html-eslint's formatting rules
    // are turned off and only correctness/accessibility rules stay on.
    {
      files: ['*.html', '**/*.html'],
      parser: '@html-eslint/parser',
      plugins: ['@html-eslint'],
      extends: ['plugin:@html-eslint/recommended-legacy'],
      rules: {
        '@html-eslint/indent': 'off',
        '@html-eslint/quotes': 'off',
        '@html-eslint/attrs-newline': 'off',
        '@html-eslint/element-newline': 'off',
        '@html-eslint/no-extra-spacing-tags': 'off',
        '@html-eslint/require-closing-tags': 'off',

        // No inline event handlers (onclick="...", onload="...", any case).
        '@html-eslint/no-restricted-attrs': [
          'error',
          {
            tagPatterns: ['.*'],
            attrPatterns: ['^[oO][nN]', '^[sS][rR][cC][dD][oO][cC]$'],
            message:
              'Inline event handlers and srcdoc are not allowed. Attach listeners with addEventListener() in a .js file.',
          },
        ],
        // No javascript: URLs in links, forms, frames or images.
        '@html-eslint/no-restricted-attr-values': [
          'error',
          {
            attrPatterns: ['^(href|src|action|formaction|xlink:href|data)$'],
            attrValuePatterns: [
              '^\\s*[jJ][aA][vV][aA][sS][cC][rR][iI][pP][tT]:',
            ],
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
      },
    },
  ],
};
