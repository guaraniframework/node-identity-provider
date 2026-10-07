module.exports = {
  '*.{js,ts}': ['pnpm exec eslint --fix', 'pnpm exec prettier --write'],
};
