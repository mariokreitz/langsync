# LangSync GitHub Action

A composite GitHub Action that runs `langsync validate` in CI and (optionally)
comments the report on the pull request. It wraps the published CLI via `npx`,
so there is no separate build or release pipeline for the action itself.

> Scope: V2 ships `validate` (and, by extension, missing/extra/empty detection).
> AI `translate` in CI is deferred to a later release once API-key secret
> handling is finalized.

## Usage

```yaml
name: i18n
on:
  pull_request:
    branches: [main]

permissions:
  contents: read
  pull-requests: write

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - uses: mariokreitz/langsync/packages/github-action@v2
        with:
          working-directory: .
          version: latest
          fail-on-issues: true
          comment: true
```

## Inputs

| Input               | Default               | Description                                       |
| ------------------- | --------------------- | ------------------------------------------------- |
| `working-directory` | `.`                   | Directory containing `langsync.config.*`.         |
| `version`           | `latest`              | `@mariokreitz/langsync` version to run via `npx`. |
| `fail-on-issues`    | `true`                | Fail the job on missing/extra issues.             |
| `comment`           | `true`                | Post a summary comment on the pull request.       |
| `github-token`      | `${{ github.token }}` | Token used to post the PR comment.                |

## Outputs

| Output   | Description                 |
| -------- | --------------------------- |
| `report` | The JSON validation report. |
