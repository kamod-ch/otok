---
title: Storage Extension
section: Guides
order: 35
---
# @kamod-ch/otok-storage

Provider-based object storage with typed bucket configuration and server-side secrets only.

## Providers

| Provider | Use case |
|----------|----------|
| `test` | In-memory storage for tests |
| `local` | Filesystem under `.otok-storage` |
| `s3` | AWS S3 |
| `r2` | Cloudflare R2 |
| `minio` | MinIO or S3-compatible endpoints |

## Plugin

```ts
import storage from "@kamod-ch/otok-storage";

export default defineConfig({
  plugins: [
    storage({
      provider: { type: "local" },
      buckets: {
        uploads: {
          name: "uploads",
          maxSizeBytes: 5 * 1024 * 1024,
          allowedMimeTypes: ["image/*"],
        },
      },
    }),
  ],
});
```

Clients receive presigned URLs from server actions — never storage credentials.

See [`packages/otok-storage/README.md`](https://github.com/kamod-ch/otok/tree/main/packages/otok-storage).
