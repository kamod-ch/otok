---
"@kamod-ch/otok": patch
---

Fix HTML server cache isolation: versioned cache keys (route id, URL, query, verified scope, Vary), skip shared cache for personalized requests without scope, honor noStore/Set-Cookie/errors, drop unsupported in-process SWR stale serves, and bound the memory provider.
