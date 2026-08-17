/**
 * Conventional Commits enforcement, read by
 * bauer-group/automation-templates/.github/workflows/modules-pr-validation.yml.
 *
 * Kept in sync with the root commitlint.config.js, which serves the local
 * simple-git-hooks commit-msg hook. Two files because the two consumers look in
 * different places; without this one the CI commitlint step degrades silently
 * (the module runs it under continue-on-error).
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [0],
    'body-max-line-length': [0],
  },
};
