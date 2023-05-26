module.exports = {
  '*.{ts,tsx,js,jsx}': ['npm run lint:eslint --', 'npm run lint:prettier --'],
  '{!(package)*.json,*.code-snippets,.!(browserslist|npm)*rc}': ['npm run lint:prettier -- --parser json'],
  'package.json': ['npm run lint:prettier --'],
  '*.vue': ['npm run lint:eslint --', 'npm run lint:stylelint -- --aei', 'npm run lint:prettier --'],
  '*.{css,scss}': ['npm run lint:stylelint -- --aei', 'npm run lint:prettier --'],
};
