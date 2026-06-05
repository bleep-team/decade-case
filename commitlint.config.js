export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        // Packages
        'typescript-config',
        'eslint-config',
        'ui',
        'db',
        'auth',
        'logger',
        'types',
        'matching-engine',
        'exchange-runtime',
        'mcp',
        // Apps
        'web',
        // Cross-cutting
        'ci',
        'deps',
        'repo',
        'docker',
      ],
    ],
    'scope-empty': [1, 'never'],
  },
}
