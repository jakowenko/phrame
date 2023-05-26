// Disable no-extraneous-dependencies because vite is not set up in airbnb's eslint config
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
  root: true,
  extends: [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    'airbnb-base',
    'airbnb-typescript/base',
    '@vue/eslint-config-typescript/recommended',
    '@vue/eslint-config-prettier',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    // Not needed, but keeping in case we need to revisit this.
    // project: './tsconfig.eslint.json',
  },
  env: {
    'vue/setup-compiler-macros': true,
  },
  settings: {
    'import/resolver': {
      typescript: {}, // this loads <rootdir>/tsconfig.json to eslint
    },
  },
  rules: {
    // Modify some Typescript Linting rules because they require parserOptions.project to be defined, which noticeably slows down lint-on-save.
    '@typescript-eslint/dot-notation': 0,
    '@typescript-eslint/no-implied-eval': 0,
    '@typescript-eslint/no-throw-literal': 0,
    '@typescript-eslint/return-await': 0,
    '@typescript-eslint/naming-convention': 0,

    // Turn on the base eslint rules that Typescript turned off above.
    'dot-notation': [
      'error',
      {
        allowKeywords: true,
        allowPattern: '',
      },
    ],
    'no-implied-eval': ['error'],
    'no-throw-literal': ['error'],
    'no-return-await': ['error'],

    // Only allow debugger in development
    'no-debugger': process.env.PRE_COMMIT ? 'error' : 'warn',
    // Only allow `console.log` in development
    'no-console': process.env.PRE_COMMIT
      ? ['error', { allow: ['warn', 'error'] }]
      : ['warn', { allow: ['warn', 'error'] }],
    // 'max-len': 0,
    // Allow object properties to be reassigned.
    'no-param-reassign': ['error', { props: false }],
    // Disable global-require to allow for dynamic image imports
    'global-require': 'off',
    // Disable underscore dangle restriction
    'no-underscore-dangle': 'off',
    // Disable prefer-destructuring for arrays only
    'prefer-destructuring': ['error', { object: true, array: false }],
    // Allow for-of statements. Only way to do this is to change the default Airbnb rules,
    'no-restricted-syntax': [
      'error',
      {
        selector: 'ForInStatement',
        message:
          'for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.',
      },
      {
        selector: 'LabeledStatement',
        message: 'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
      },
      {
        selector: 'WithStatement',
        message: '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
      },
    ],
    // Vue rules (mostly to enforce airbnb in <template>)
    'vue/no-unused-components': process.env.PRE_COMMIT ? 'error' : 'warn',
    'vue/eqeqeq': 'error',
    'vue/no-empty-pattern': 'error',
    'vue/no-boolean-default': ['error', 'default-false'],
    'vue/no-irregular-whitespace': 'error',
    'vue/no-reserved-component-names': 'error',
    'vue/padding-line-between-blocks': 'error',
    'vue/v-slot-style': [
      'error',
      {
        atComponent: 'v-slot',
        default: 'v-slot',
        named: 'longform',
      },
    ],
    'vue/valid-v-slot': 'error',
  },
};
