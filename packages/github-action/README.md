# LangSync GitHub Action

A composite GitHub Action that runs `langsync validate` in CI and (optionally)
comments the report on the pull request. It wraps the published CLI via `npx`,
so there is no separate build or release pipeline for the action itself.

> It can also optionally run `langsync translate` first to fill empty values
> with an AI provider. Translate is **off by default** and requires an API key
> passed via a secret. While DeepL, Anthropic, and Gemini are experimental, the
> action sets `LANGSYNC_AI_EXPERIMENTAL=1` for the translate step automatically.

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
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 22
      - uses: mariokreitz/langsync/packages/github-action@v2
        with:
          working-directory: .
          version: latest
          fail-on-issues: true
          comment: true
```

### With AI translate

```yaml
- uses: mariokreitz/langsync/packages/github-action@v2
  with:
    translate: true
    ai-provider: openai
    ai-api-key: ${{ secrets.OPENAI_API_KEY }}
    ai-model: gpt-4o-mini
    ai-dry-run: true # recommended on PRs; full translate on merge
    fail-on-issues: true
    comment: true
```

> Translate calls a paid AI API for every empty key on every run. Prefer
> `ai-dry-run: true` on pull-request checks.

## Inputs

| Input               | Default               | Description                                            |
| ------------------- | --------------------- | ------------------------------------------------------ |
| `working-directory` | `.`                   | Directory containing `langsync.config.*`.              |
| `version`           | `latest`              | `@mariokreitz/langsync` version to run via `npx`.      |
| `fail-on-issues`    | `true`                | Fail the job on missing/extra issues.                  |
| `comment`           | `true`                | Post a summary comment on the pull request.            |
| `github-token`      | `${{ github.token }}` | Token used to post the PR comment.                     |
| `translate`         | `false`               | Run `langsync translate` before validating.            |
| `ai-provider`       | `openai`              | `openai`, `deepl`, `anthropic`, or `gemini`.           |
| `ai-api-key`        | —                     | Provider API key. Required when `translate: true`.     |
| `ai-model`          | —                     | Provider model id. Uses the provider default if empty. |
| `ai-dry-run`        | `false`               | Report planned translations without writing files.     |

## Outputs

| Output   | Description                 |
| -------- | --------------------------- |
| `report` | The JSON validation report. |
