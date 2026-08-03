# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 1.0.x | Yes |
| 0.4.x | Security fixes until 2027-02-01 (6 months after 1.0 GA target) |
| < 0.4 | No |

## Reporting a vulnerability

**Do not** open public GitHub issues for security vulnerabilities.

Email: **security@kamod.ch**

Include:

- Description and impact
- Steps to reproduce
- Affected versions
- Suggested fix (optional)

We aim to acknowledge within **48 hours** and provide an initial assessment within **7 days**.

## Responsible disclosure

We follow coordinated disclosure:

1. Reporter submits private report
2. Maintainers confirm and develop fix
3. Patch released with CVE if applicable
4. Public disclosure after patch available (typically within 90 days)

Credit given in changelog unless anonymity requested.

## Security practices

- npm provenance on published packages
- `pnpm audit` recommended before release
- `@kamod-ch/otok-security` middleware for apps
- Registry `securityNotes` for extension guidance
- `otok doctor` checks client/server boundary leaks

## Scope

In scope:

- `otok` core, adapters, official `@kamod-ch/*` plugins
- `otok-cli`, `create-otok`
- Published npm packages under `@otok/*`

Out of scope:

- Third-party community plugins (report to publisher)
- User application code
- Denial-of-service via misconfiguration

## Safe harbor

We support good-faith security research. Do not access user data without permission, exfiltrate data, or disrupt services.

## Security updates

Subscribe to [GitHub Security Advisories](https://github.com/kamod-ch/otok/security/advisories) for this repository.

See also [docs/governance/deprecation-policy.md](./docs/governance/deprecation-policy.md).
