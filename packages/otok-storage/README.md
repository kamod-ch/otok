# @kamod-ch/otok-storage

Provider-based object storage for [Otok](https://github.com/kamod-ch/otok) apps.

Upload, download, delete, presigned URLs, and streaming — without coupling Otok to a single vendor. Secrets stay on the server; clients receive presigned URLs only.

## Install

```bash
pnpm add @kamod-ch/otok-storage
# Optional for S3 / R2 / MinIO:
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## Plugin

```ts
import { defineConfig } from "otok";
import storage from "@kamod-ch/otok-storage";

export default defineConfig({
  plugins: [
    storage({
      provider: { type: "local" },
      buckets: {
        uploads: {
          name: "uploads",
          maxSizeBytes: 5 * 1024 * 1024,
          allowedMimeTypes: ["image/*", "application/pdf"],
        },
      },
    }),
  ],
});
```

## Usage

```ts
import { getStorageClient } from "@kamod-ch/otok-storage";

const storage = getStorageClient();

const meta = await storage.upload({
  bucket: "uploads",
  key: `avatars/${userId}.png`,
  body: fileBytes,
  contentType: "image/png",
});

const downloadUrl = await storage.getPresignedUrl({
  bucket: "uploads",
  key: meta.key,
  expiresInSeconds: 900,
});
```

## Providers

| Provider | Config | Notes |
|----------|--------|-------|
| `test` | `{ type: "test" }` | In-memory store for tests. |
| `local` | `{ type: "local", rootDir? }` | Filesystem under `.otok-storage` by default. |
| `s3` | `{ type: "s3", bucket, region? }` | AWS S3 via AWS SDK. |
| `r2` | `{ type: "r2", bucket, accountId? }` | Cloudflare R2 (S3-compatible). |
| `minio` | `{ type: "minio", bucket, endpoint }` | MinIO or other S3-compatible stores. |

## Bucket validation

Each logical bucket key maps to a typed config with optional `maxSizeBytes` and `allowedMimeTypes`. Validation runs before upload — invalid files never reach the provider.

## Env vars

```
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
CLOUDFLARE_ACCOUNT_ID=
```

## Exports

| Subpath | Purpose |
|---------|---------|
| `@kamod-ch/otok-storage` | Plugin factory, `getStorageClient`, types |
| `@kamod-ch/otok-storage/providers/local` | Local filesystem provider |
| `@kamod-ch/otok-storage/providers/s3` | S3/R2/MinIO provider factories |
| `@kamod-ch/otok-storage/providers/test` | Test provider helpers |
