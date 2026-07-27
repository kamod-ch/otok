# SEO, Security & Observability Example

Demonstrates recommended plugin order and integration between `@kamod-ch/otok-security`, `@kamod-ch/otok-observability`, and `@kamod-ch/otok-seo`.

## Run

```bash
pnpm install
pnpm dev
```

Open http://localhost:3010 and inspect:

- Page source for OG/Twitter/JSON-LD tags
- `/robots.txt` and `/sitemap.xml`
- Response headers: `x-request-id`, security headers, CSP

## Middleware order

```ts
plugins: [security(), observability(), seo()]
```

Security runs first (CSRF, CSP, body limits). Observability wraps every request with IDs and structured logs. SEO serves utility routes after guards are in place.

## Typed metadata

See `src/app/routes/products/widget.tsx` for `defineMeta` with loader data.
