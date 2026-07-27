export { default } from "./plugin.js";
export { createStorageClient, StorageClient } from "./client.js";
export { getStorageClient, configureStorageApp } from "./plugin.js";
export { createStorageProvider } from "./factory.js";
export { getStorageRuntime } from "./registry.js";
export {
  OtokStorageConfigError,
  OtokStorageError,
  OtokStorageValidationError,
} from "./errors.js";
export type {
  BucketConfig,
  LocalProviderConfig,
  MinioProviderConfig,
  PresignedUrlInput,
  PresignedUrlResult,
  R2ProviderConfig,
  S3ProviderConfig,
  StoragePluginOptions,
  StorageProvider,
  StorageProviderCapabilities,
  StorageProviderConfig,
  StorageRuntime,
  StoredObjectMeta,
  TestProviderConfig,
  UploadFileInput,
  UploadInput,
} from "./types.js";
