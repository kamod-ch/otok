---
"@kamod-ch/otok-workflows": minor
---

Add lease renewal and token-fenced instance/step writes (`renewLease`, `updateInstanceIfHeld`, `saveStepIfHeld`). The engine renews leases during claimed execution and surfaces `LEASE_LOST` when a worker loses its lease. Unclaimed `execute` is rejected while another worker holds an active lease.
