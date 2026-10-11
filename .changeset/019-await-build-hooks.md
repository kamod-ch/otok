---
"@kamod-ch/otok-vite-plugin": patch
---

Await Otok plugin container `buildStart` and `buildEnd` hooks in the Vite bridge so async plugin and adapter lifecycle work completes before Vite proceeds.
