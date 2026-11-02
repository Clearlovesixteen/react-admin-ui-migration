module.exports = {
  extends: ['stylelint-config-recommended-less'],
  rules: {
    'no-descending-specificity': null,
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global'] }],
  },
};
