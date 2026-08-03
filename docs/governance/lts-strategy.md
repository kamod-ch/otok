# LTS Strategy

## Overview

After Otok **1.0.0**, we adopt a simplified LTS model aligned with Node.js LTS cycles.

## Release lines

| Line | Support | Updates |
|------|---------|---------|
| **Current** | Latest minor on main branch | Features, fixes, security |
| **LTS** | Previous major after next major ships | Fixes and security only |
| **EOL** | Unsupported | No patches |

## Timeline (example)

| Version | Status | EOL |
|---------|--------|-----|
| 0.4.x | Maintenance until 1.0 GA | 6 months after 1.0.0 |
| 1.0.x | LTS when 2.0 ships | T+12 months from 2.0 |
| 2.x | Current | — |

Exact dates announced in release notes.

## LTS criteria

A major becomes LTS when:

1. Next major RC is published
2. Migration guide from LTS → current exists
3. Security patches backported for **12 months**

## Backport policy

| Change type | LTS |
|-------------|-----|
| Security CVE | Yes |
| Critical data-loss bug | Yes |
| Features | No |
| Experimental API changes | No |

## Node.js alignment

Recommend Node **22 LTS** for production. Otok LTS lines test against active Node LTS versions at time of release.

## Enterprise

For extended support beyond public LTS, contact maintainers via `security@kamod.ch`.
