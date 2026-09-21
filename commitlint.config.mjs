// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  // Dependabot compare URLs exceed body-max-line-length (100). The subject
  // is already Conventional Commits; do not lint the generated body.
  ignores: [
    (message) =>
      message.includes('Signed-off-by: dependabot[bot] <support@github.com>'),
  ],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'chore', 'test', 'docs', 'ci', 'refactor'],
    ],
  },
}
