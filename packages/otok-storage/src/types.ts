import type { Readable } from "node:stream";

export interface StorageProviderCapabilities {
  presignedUrls: boolean;
  streaming: boolean;
  publicUrls: boolean;
}

export interface BucketConfig {
  name: string;
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
  public?: boolean;
}

export interface StoredObjectMeta {
  key: string;
  bucket: string;
  size: number;
  contentType?: string;
  etag?: string;
  updatedAt?: string;
}

export interface UploadInput {
  bucket: string;
  key: string;
  body: Uint8Array | Readable | AsyncIterable<Uint8Array>;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface PresignedUrlInput {
  bucket: string;
  key: string;
  expiresInSeconds?: number;
  method?: "GET" | "PUT";
}

export interface PresignedUrlResult {
  url: string;
  expiresAt: string;
}

export interface StorageProvider {
  readonly name: string;
  readonly capabilities: StorageProviderCapabilities;
  upload(input: UploadInput): Promise<StoredObjectMeta>;
  download(bucket: string, key: string): Promise<Uint8Array>;
  downloadStream(bucket: string, key: string): Promise<Readable>;
  delete(bucket: string, key: string): Promise<void>;
  exists(bucket: string, key: string): Promise<boolean>;
  getPresignedUrl?(input: PresignedUrlInput): Promise<PresignedUrlResult>;
}

export type LocalProviderConfig = {
  type: "local";
  rootDir?: string;
};

export type S3ProviderConfig = {
  type: "s3";
  bucket: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  forcePathStyle?: boolean;
  accessKeyEnv?: string;
  secretKeyEnv?: string;
};

export type R2ProviderConfig = Omit<S3ProviderConfig, "type"> & {
  type: "r2";
  accountId?: string;
  accountIdEnv?: string;
};

export type MinioProviderConfig = Omit<S3ProviderConfig, "type"> & {
  type: "minio";
};

export type TestProviderConfig = {
  type: "test";
};

export type StorageProviderConfig =
  | LocalProviderConfig
  | S3ProviderConfig
  | R2ProviderConfig
  | MinioProviderConfig
  | TestProviderConfig;

export interface StoragePluginOptions {
  provider: StorageProviderConfig;
  buckets: Record<string, BucketConfig>;
}

export interface StorageRuntime {
  provider: StorageProvider;
  buckets: Record<string, BucketConfig>;
}

export interface UploadFileInput {
  bucket: string;
  key: string;
  body: UploadInput["body"];
  contentType?: string;
  metadata?: Record<string, string>;
}
