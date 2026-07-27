import { OtokStorageValidationError } from "./errors.js";
import type { BucketConfig, UploadFileInput } from "./types.js";

export function resolveBucketConfig(
  buckets: Record<string, BucketConfig>,
  bucket: string,
): BucketConfig {
  const config = buckets[bucket];
  if (!config) {
    throw new OtokStorageValidationError(`unknown bucket "${bucket}"`);
  }
  return config;
}

export function validateUpload(
  bucketConfig: BucketConfig,
  input: UploadFileInput,
  sizeBytes: number,
): void {
  if (bucketConfig.maxSizeBytes !== undefined && sizeBytes > bucketConfig.maxSizeBytes) {
    throw new OtokStorageValidationError(
      `file exceeds max size for bucket "${bucketConfig.name}" (${sizeBytes} > ${bucketConfig.maxSizeBytes})`,
    );
  }

  if (bucketConfig.allowedMimeTypes?.length && input.contentType) {
    const allowed = bucketConfig.allowedMimeTypes.some((pattern) =>
      matchMimePattern(input.contentType!, pattern),
    );
    if (!allowed) {
      throw new OtokStorageValidationError(
        `content type "${input.contentType}" is not allowed in bucket "${bucketConfig.name}"`,
      );
    }
  }
}

function matchMimePattern(contentType: string, pattern: string): boolean {
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -1);
    return contentType.startsWith(prefix);
  }
  return contentType === pattern;
}

export async function bodyToBuffer(body: UploadFileInput["body"]): Promise<Uint8Array> {
  if (body instanceof Uint8Array) return body;
  if (Symbol.asyncIterator in Object(body)) {
    const chunks: Uint8Array[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return concatUint8Arrays(chunks);
  }
  const { Readable } = await import("node:stream");
  if (body instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.from(chunk));
    }
    return new Uint8Array(Buffer.concat(chunks));
  }
  throw new OtokStorageValidationError("unsupported upload body type");
}

function concatUint8Arrays(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export function resolveEnvValue(name: string, label: string): string {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(`otok-storage: missing ${label}. Set environment variable ${name}.`);
  }
  return value.trim();
}
