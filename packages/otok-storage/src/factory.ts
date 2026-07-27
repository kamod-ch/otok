import { OtokStorageConfigError } from "./errors.js";
import type { StorageProvider, StorageProviderConfig } from "./types.js";
import { createLocalStorageProvider } from "./providers/local.js";
import { createMinioStorageProvider, createR2StorageProvider, createS3StorageProvider } from "./providers/s3.js";
import { createTestStorageProvider } from "./providers/test.js";

export async function createStorageProvider(config: StorageProviderConfig): Promise<StorageProvider> {
  switch (config.type) {
    case "test":
      return createTestStorageProvider();
    case "local":
      return createLocalStorageProvider(config);
    case "s3":
      if (!config.bucket?.trim()) {
        throw new OtokStorageConfigError("s3 provider requires bucket");
      }
      return createS3StorageProvider(config);
    case "r2":
      if (!config.bucket?.trim()) {
        throw new OtokStorageConfigError("r2 provider requires bucket");
      }
      return createR2StorageProvider(config);
    case "minio":
      if (!config.bucket?.trim()) {
        throw new OtokStorageConfigError("minio provider requires bucket");
      }
      return createMinioStorageProvider(config);
    default: {
      const unknown = config as { type?: string };
      throw new OtokStorageConfigError(`unknown storage provider "${unknown.type ?? "undefined"}"`);
    }
  }
}
