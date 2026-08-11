# Devtools demo

Minimal example app showing `@kamod-ch/otok-devtools` in development.

## Run

```bash
pnpm install
pnpm dev
```

Open http://localhost:5173 and click **Otok Devtools** in the bottom-right corner.

The JSON feed is available at `/__otok_devtools`.

## Notes

- Keep `@kamod-ch/otok-devtools` as a development dependency.
- Production builds must not import the client panel.
- The panel never displays cookies, tokens, or full form values.
