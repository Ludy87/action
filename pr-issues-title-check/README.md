# PR & Issues Title Verify

## Description

`PR & Issues Title Verify` is a GitHub Action that checks the title of pull requests and issues against a specified regex pattern. It can add labels and comments to issues or pull requests that do not match the pattern and can handle actors without restrictions.

## Inputs

- **`issues_pattern`**: Regex pattern to match against the title (optional).
- **`issues_pattern_flags`**: Flags for the regex input (optional).
- **`issues_min_length`**: Minimum length of the title (optional).
- **`issues_max_length`**: Maximum length of the title. Set to `-1` to ignore this rule (optional).
- **`issues_labels`**: Comma-separated list of labels to add if the title does not match the pattern. Default: `Title invalid, Stale`.
- **`issues_comment`**: Comment to add if the title does not match the pattern (optional).
- **`issues_prefix`**: List of title prefixes to check against (optional).
- **`actor_without_restriction`**: List of actors that are exempt from title restrictions (optional).
- **`token`**: Token for the repository. Can be passed in using `GITHUB_TOKEN`. Required.

## Outputs

- **`valid`**: Boolean indicating if the title is valid.

## Usage

```yaml
name: 'PR & Issues Title Verify'

on:
  issues:
    types: [opened, edited]
  pull_request:
    types: [opened, edited]

jobs:
  check-title:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Verify PR & Issues Title
        uses: Ludy87/pr-issues-title-verify@v1
        with:
          issues_pattern: '^(feat|fix|docs|style|refactor|test|chore): .{10,50}$'
          issues_pattern_flags: 'i'
          issues_min_length: 10
          issues_max_length: 50
          issues_labels: 'Title invalid, Needs review'
          issues_comment: 'Please provide a more descriptive title for the issue or pull request.'
          issues_prefix: 'feat, fix, docs, style, refactor, test, chore'
          actor_without_restriction: 'dependabot, bots'
          token: ${{ secrets.GITHUB_TOKEN }}
