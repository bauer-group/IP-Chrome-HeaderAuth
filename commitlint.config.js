/**
 * Conventional Commits enforcement (BAUER GROUP commit standard).
 * @see https://www.conventionalcommits.org
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [0],
    'body-max-line-length': [0],
  },
};
