module.exports = {
  env: { node: true, es2021: true },
  extends: ['airbnb-base', 'prettier'],
  plugins: ['import'],
  rules: {
    'import/extensions': 0,
    'import/no-extraneous-dependencies': 0,
    'import/no-unresolved': 0,
    'no-console': 0,
    'consistent-return': 0
  }
};
