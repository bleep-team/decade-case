export default {
  'packages/**/*.{ts,tsx}': ['eslint --fix --no-warn-ignored', 'prettier --write'],
  'apps/**/*.{ts,tsx}': ['eslint --fix --no-warn-ignored', 'prettier --write'],
  'packages/**/*.{js,jsx,mjs}': ['eslint --fix --no-warn-ignored', 'prettier --write'],
  'apps/**/*.{js,jsx,mjs}': ['eslint --fix --no-warn-ignored', 'prettier --write'],
  '*.{json,md,yml,yaml,css}': ['prettier --write'],
  '*.{js,jsx,mjs}': ['prettier --write'],
}
