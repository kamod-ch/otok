---
"@kamod-ch/otok-auth": patch
"@kamod-ch/otok-supabase": patch
"@kamod-ch/otok-security": patch
---

Normalize redirect targets before allowlist and origin checks: reject control characters and backslashes, canonicalize path segments via URL parsing, and return safe canonical Location values to block open-redirect normalization gaps.
