# Static adapter example

```bash
pnpm install
pnpm build
# Serves from dist/index.html and dist/about/index.html
```

Routes with `loader` or `action` exports fail the build when `strict: true`.
