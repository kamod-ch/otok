---
"@kamod-ch/otok-security": patch
---

Register host validation middleware when `trustedOrigins` is set even if `trustedHosts` is empty, so origin checks apply in origin-only security configurations.
