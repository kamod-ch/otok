# @kamod-ch/otok-kit-saas

Billing and subscriptions kit for Otok — checkout, customer portal, and Stripe webhooks.

This kit is **not** a marketing demo. UI is a thin billing console; Stripe live calls go through `@kamod-ch/otok-stripe`.

```bash
pnpm create otok my-saas --variant saas
pnpm --filter @kamod-ch/otok-kit-saas test
```

`--variant saas` auto-composes this kit via `PRESET_KIT_MAP`.

See [docs/extension-points.md](./docs/extension-points.md).
