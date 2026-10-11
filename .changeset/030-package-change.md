---
"@kamod-ch/otok-ai": patch
---

Fix stream operation timeouts so `timeoutMs` covers full async iterator consumption (including blocked `next()` and tool rounds), distinguish user abort from client timeout, remove merged-signal listener leaks, and cancel tee sources when both branches close early.
