---
"otok": minor
---

Wire deferred data and loading boundaries into SSR: `createDeferredSlot` + `DeferredBoundary` stream critical HTML before slow loader regions resolve (sequential zero-JS HTML), with buffered fallback when streaming is off.
