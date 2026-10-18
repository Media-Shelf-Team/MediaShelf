module.exports = {
  // Stop ESLint from also picking up the repo-root .eslintrc.js, whose
  // plugins are installed in the root node_modules, not functions/.
  root: true,
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  extends: ['eslint:recommended', 'google'],
  rules: {
    'no-restricted-globals': ['error', 'name', 'length'],
    'prefer-arrow-callback': 'error',

    // Security: no HTML injection, no eval (direct or implied), no loose
    // equality. Same coverage as the root securityRules.
    eqeqeq: ['error', 'always'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
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
      ].map((property) => ({
        property,
        message: `${property} parses a string as HTML (XSS risk).`,
      })),
    ],
    'no-restricted-syntax': [
      'error',
      {
        selector:
          'MemberExpression[property.name=/^(write|writeln)$/]' +
          ":matches([object.name='document'], " +
          "[object.property.name='document'])",
        message: 'document.write() parses a string as HTML (XSS risk).',
      },
      {
        selector:
          "CallExpression[callee.property.name='setAttribute']" +
          '[arguments.0.value=/^(on|srcdoc$)/i]',
        message: 'on* and srcdoc attributes allow script injection (XSS).',
      },
      {
        selector:
          "CallExpression[callee.property.name='setAttributeNS']" +
          '[arguments.1.value=/^(on|srcdoc$)/i]',
        message: 'on* and srcdoc attributes allow script injection (XSS).',
      },
      {
        selector:
          'ObjectExpression > ' +
          'Property[key.name=/^(innerHTML|outerHTML|srcdoc)$/], ' +
          'ObjectExpression > ' +
          'Property[key.value=/^(innerHTML|outerHTML|srcdoc)$/]',
        message: 'This key parses a string as HTML (XSS risk).',
      },
    ],
  },
  overrides: [
    {
      files: ['**/*.spec.*'],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};
