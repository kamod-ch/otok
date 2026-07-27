import { OtokStorageValidationError } from "./errors.js";
import type {
  PresignedUrlInput,
  PresignedUrlResult,
  StorageProvider,
  StoredObjectMeta,
  UploadInput,
} from "./types.js";
import { bodyToBuffer, resolveBucketConfig, validateUpload } from "./validation.js";
import type { StorageRuntime, UploadFileInput } from "./types.js";

export class StorageClient {
  constructor(private readonly runtime: StorageRuntime) {}

  async upload(input: UploadFileInput): Promise<StoredObjectMeta> {
    const bucketConfig = resolveBucketConfig(this.runtime.buckets, input.bucket);
    const buffer = await bodyToBuffer(input.body);
    validateUpload(bucketConfig, input, buffer.byteLength);

    return this.runtime.provider.upload({
      bucket: bucketConfig.name,
      key: input.key,
      body: buffer,
      contentType: input.contentType,
      metadata: input.metadata,
    });
  }

  async download(bucket: string, key: string): Promise<Uint8Array> {
    const bucketConfig = resolveBucketConfig(this.runtime.buckets, bucket);
    return this.runtime.provider.download(bucketConfig.name, key);
  }

  async downloadStream(bucket: string, key: string) {
    const bucketConfig = resolveBucketConfig(this.runtime.buckets, bucket);
    if (!this.runtime.provider.capabilities.streaming) {
      throw new OtokStorageValidationError(`provider "${this.runtime.provider.name}" does not support streaming`);
    }
    return this.runtime.provider.downloadStream(bucketConfig.name, key);
  }

  async delete(bucket: string, key: string): Promise<void> {
    const bucketConfig = resolveBucketConfig(this.runtime.buckets, bucket);
    await this.runtime.provider.delete(bucketConfig.name, key);
  }

  async exists(bucket: string, key: string): Promise<boolean> {
    const bucketConfig = resolveBucketConfig(this.runtime.buckets, bucket);
    return this.runtime.provider.exists(bucketConfig.name, key);
  }

  async getPresignedUrl(input: Omit<PresignedUrlInput, "bucket"> & { bucket: string }): Promise<PresignedUrlResult> {
    const bucketConfig = resolveBucketConfig(this.runtime.buckets, input.bucket);
    const presign = this.runtime.provider.getPresignedUrl;
    if (!presign) {
      throw new OtokStorageValidationError(
        `provider "${this.runtime.provider.name}" does not support presigned URLs`,
      );
    }
    return presign({
      bucket: bucketConfig.name,
      key: input.key,
      expiresInSeconds: input.expiresInSeconds,
      method: input.method,
    });
  }
}

export function createStorageClient(runtime: StorageRuntime): StorageClient {
  return new StorageClient(runtime);
}

export type { StorageProvider, UploadInput, StoredObjectMeta };
