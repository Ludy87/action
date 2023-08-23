# action
Actions yaml

## Merge

```yml

name: Set Labels on Pull Request

on:
  pull_request:
    types:
      - closed
      - reopened
      
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3.5.3
      - name: Check if Pull Request
        id: check_pr
        run: echo "is_pull_request=${{ github.event_name == 'pull_request' }}" >> $GITHUB_ENV
      - if: env.is_pull_request == 'true'
        name: Merge
        uses: Ludy87/action/merge@v1.0.3

```

## update HACS.json

```yaml
name: Daily Update

on:
  schedule:
    - cron: "0 0 * * *"

jobs:
  update:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v3
      - uses: Ludy87/action/update_hacs_hassio@v1.0.3

```
