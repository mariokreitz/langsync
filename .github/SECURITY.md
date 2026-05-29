# Security Policy

Security is important for LangSync because localization workflows often run in CI, touch release artifacts, and may process business-critical content. Please report potential vulnerabilities privately so they can be reviewed and fixed before public disclosure.

## Supported versions

LangSync is currently in early release. Security fixes are prioritized for:

| Version                  | Supported   |
| ------------------------ | ----------- |
| Latest published release | Yes         |
| Older releases           | Best effort |
| Unreleased `main` branch | Yes         |

When a security fix is required, the maintainers may publish a patch release and document the impact in the release notes.

## Reporting a vulnerability

Do not open a public GitHub issue for a suspected vulnerability.

Use GitHub private vulnerability reporting when available:

<https://github.com/mariokreitz/langsync/security/advisories/new>

If private vulnerability reporting is not available, contact the maintainer through the GitHub profile associated with this repository and include enough information to reproduce or assess the issue.

Please include:

- A clear description of the vulnerability.
- Affected package, command, workflow, or documentation area.
- Affected version or commit SHA, if known.
- Steps to reproduce or a minimal proof of concept.
- Potential impact and any known mitigations.
- Whether the vulnerability is already public.

## Response expectations

The maintainers aim to:

1. Acknowledge valid reports within 5 business days.
2. Triage severity and affected versions.
3. Prepare a fix, mitigation, or advisory as appropriate.
4. Coordinate disclosure timing with the reporter when practical.

Response times may vary for complex reports or reports that require dependency, CI, or package registry coordination.

## Automated security tooling

This repository uses automated security scanning as part of its defense-in-depth approach:

- GitGuardian is set up for secret detection.
- Snyk is set up for dependency and vulnerability monitoring.
- Dependabot is configured for dependency update automation.
- CI validates formatting, builds, type checks, linting, and tests before changes are merged.

Automated scanning complements responsible disclosure. It does not replace private reporting for suspected vulnerabilities.

## Scope

Security reports are most useful when they affect one or more of the following:

- The published `@mariokreitz/langsync` CLI package.
- Workspace packages under `packages/`.
- CI, release, package publishing, or documentation deployment workflows.
- Configuration loading, file handling, Excel import/export, or locale synchronization behavior.
- Dependency, supply-chain, or secret exposure risks in this repository.

Reports about unrelated infrastructure, social engineering, spam, or issues requiring physical access are out of scope unless they directly affect the LangSync project.

## Safe harbor

Good-faith security research is welcome when it:

- Avoids privacy violations, data destruction, or service disruption.
- Does not access, modify, or exfiltrate data that is not yours.
- Uses only the minimum actions necessary to demonstrate impact.
- Is reported privately and allows reasonable time for remediation.

The maintainers will not pursue action against good-faith reports that follow this policy.
