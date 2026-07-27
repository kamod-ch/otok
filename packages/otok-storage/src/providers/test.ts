import { Readable } from "node:stream";
import type { StorageProvider, StoredObjectMeta, UploadInput } from "../types.js";

interface StoredEntry extends StoredObjectMeta {
  body: Uint8Array;
  metadata?: Record<string, string>;
}

const store = new Map<string, StoredEntry>();

function storageKey(bucket: string, key: string): string {
  return `${bucket}/${key}`;
}

/** @internal Test helper */
export function resetTestStorageProvider(): void {
  store.clear();
}

export function getTestStorageEntries(): readonly StoredEntry[] {
  return [...store.values()];
}

export function createTestStorageProvider(): StorageProvider {
  return {
    name: "test",
    capabilities: {
      presignedUrls: true,
      streaming: true,
      publicUrls: false,
    },
    async upload(input: UploadInput): Promise<StoredObjectMeta> {
      const body = input.body instanceof Uint8Array ? input.body : await toBuffer(input.body);
      const meta: StoredEntry = {
        key: input.key,
        bucket: input.bucket,
        size: body.byteLength,
        contentType: input.contentType,
        updatedAt: new Date().toISOString(),
        body,
        metadata: input.metadata,
      };
      store.set(storageKey(input.bucket, input.key), meta);
      return meta;
    },
    async download(bucket, key) {
      const entry = store.get(storageKey(bucket, key));
      if (!entry) throw new Error(`object not found: ${bucket}/${key}`);
      return entry.body;
    },
    async downloadStream(bucket, key) {
      const data = await this.download(bucket, key);
      return Readable.from([Buffer.from(data)]);
    },
    async delete(bucket, key) {
      store.delete(storageKey(bucket, key));
    },
    async exists(bucket, key) {
      return store.has(storageKey(bucket, key));
    },
    async getPresignedUrl(input) {
      const expiresInSeconds = input.expiresInSeconds ?? 900;
      const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
      return {
        url: `test://${input.bucket}/${input.key}?method=${input.method ?? "GET"}&expires=${expiresAt}`,
        expiresAt,
      };
    },
  };
}

async function toBuffer(body: UploadInput["body"]): Promise<Uint8Array> {
  if (body instanceof Uint8Array) return body;
  const chunks: Uint8Array[] = [];
  if (Symbol.asyncIterator in Object(body)) {
    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
  } else {
    for await (const chunk of body as Readable) {
      chunks.push(Buffer.from(chunk));
    }
  }
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
