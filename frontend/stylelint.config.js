module.exports = {
  extends: [
    // Use the Standard config as the base
    // https://github.com/stylelint-scss/stylelint-config-standard-scss
    'stylelint-config-standard-scss',
    // Configure rules for Vue
    // https://www.npmjs.com/package/stylelint-config-recommended-vue
    'stylelint-config-standard-vue/scss',
    // Enforce a standard order for CSS properties
    // https://github.com/stormwarning/stylelint-config-recess-order
    'stylelint-config-recess-order',
  ],
  // Rule lists:
  // - https://stylelint.io/user-guide/rules/
  // - https://github.com/kristerkari/stylelint-scss#list-of-rules
  rules: {
    // Disallow allow global element/type selectors in scoped modules
    'selector-max-type': [0, { ignore: ['child', 'descendant', 'compounded'] }],
    'selector-class-pattern': null,
    // 'no-descending-specificity': null,
  },
};
