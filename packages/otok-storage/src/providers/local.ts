import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import type { LocalProviderConfig, StorageProvider, StoredObjectMeta, UploadInput } from "../types.js";

function objectPath(rootDir: string, bucket: string, key: string): string {
  return join(rootDir, bucket, key);
}

export async function createLocalStorageProvider(
  config: LocalProviderConfig = { type: "local" },
): Promise<StorageProvider> {
  const rootDir = config.rootDir ?? join(process.cwd(), ".otok-storage");

  return {
    name: "local",
    capabilities: {
      presignedUrls: false,
      streaming: true,
      publicUrls: false,
    },
    async upload(input: UploadInput): Promise<StoredObjectMeta> {
      const path = objectPath(rootDir, input.bucket, input.key);
      await mkdir(dirname(path), { recursive: true });
      const body =
        input.body instanceof Uint8Array ? Buffer.from(input.body) : Buffer.from(await streamToBuffer(input.body));
      await writeFile(path, body);
      const info = await stat(path);
      return {
        key: input.key,
        bucket: input.bucket,
        size: info.size,
        contentType: input.contentType,
        updatedAt: info.mtime.toISOString(),
      };
    },
    async download(bucket, key) {
      const data = await readFile(objectPath(rootDir, bucket, key));
      return new Uint8Array(data);
    },
    async downloadStream(bucket, key) {
      const data = await readFile(objectPath(rootDir, bucket, key));
      return Readable.from([data]);
    },
    async delete(bucket, key) {
      await rm(objectPath(rootDir, bucket, key), { force: true });
    },
    async exists(bucket, key) {
      try {
        await stat(objectPath(rootDir, bucket, key));
        return true;
      } catch {
        return false;
      }
    },
  };
}

async function streamToBuffer(body: UploadInput["body"]): Promise<Uint8Array> {
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
