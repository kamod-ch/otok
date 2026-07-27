import { Readable } from "node:stream";
import { OtokStorageConfigError } from "../errors.js";
import type {
  MinioProviderConfig,
  PresignedUrlInput,
  R2ProviderConfig,
  S3ProviderConfig,
  StorageProvider,
  StoredObjectMeta,
  UploadInput,
} from "../types.js";
import { bodyToBuffer, resolveEnvValue } from "../validation.js";

type S3LikeConfig = S3ProviderConfig | R2ProviderConfig | MinioProviderConfig;

async function loadS3Client(config: S3LikeConfig) {
  try {
    const [{ S3Client }, { getSignedUrl }, { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand }] =
      await Promise.all([
        import("@aws-sdk/client-s3"),
        import("@aws-sdk/s3-request-presigner"),
        import("@aws-sdk/client-s3"),
      ]);
    return { S3Client, getSignedUrl, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand };
  } catch {
    throw new OtokStorageConfigError(
      "S3 provider requires @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner",
    );
  }
}

function resolveS3Credentials(config: S3LikeConfig) {
  const accessKeyId =
    config.accessKeyId ?? resolveEnvValue(config.accessKeyEnv ?? "AWS_ACCESS_KEY_ID", "access key id");
  const secretAccessKey =
    config.secretAccessKey ?? resolveEnvValue(config.secretKeyEnv ?? "AWS_SECRET_ACCESS_KEY", "secret access key");
  return { accessKeyId, secretAccessKey };
}

function resolveR2Endpoint(config: R2ProviderConfig): string {
  if (config.endpoint) return config.endpoint;
  const accountId = config.accountId ?? resolveEnvValue(config.accountIdEnv ?? "CLOUDFLARE_ACCOUNT_ID", "account id");
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

export async function createS3StorageProvider(config: S3ProviderConfig): Promise<StorageProvider> {
  return createS3LikeProvider("s3", config, config.endpoint);
}

export async function createR2StorageProvider(config: R2ProviderConfig): Promise<StorageProvider> {
  return createS3LikeProvider("r2", config, resolveR2Endpoint(config));
}

export async function createMinioStorageProvider(config: MinioProviderConfig): Promise<StorageProvider> {
  if (!config.endpoint?.trim()) {
    throw new OtokStorageConfigError("minio provider requires endpoint");
  }
  return createS3LikeProvider("minio", config, config.endpoint, true);
}

async function createS3LikeProvider(
  name: string,
  config: S3LikeConfig,
  endpoint: string | undefined,
  forcePathStyle = config.forcePathStyle,
): Promise<StorageProvider> {
  const sdk = await loadS3Client(config);
  const credentials = resolveS3Credentials(config);
  const client = new sdk.S3Client({
    region: config.region ?? "auto",
    endpoint,
    forcePathStyle,
    credentials,
  });
  const bucket = config.bucket;

  async function downloadObject(_bucket: string, key: string): Promise<Uint8Array> {
    const response = await client.send(new sdk.GetObjectCommand({ Bucket: bucket, Key: key }));
    const bytes = await response.Body?.transformToByteArray();
    if (!bytes) throw new Error(`object not found: ${key}`);
    return bytes;
  }

  return {
    name,
    capabilities: {
      presignedUrls: true,
      streaming: true,
      publicUrls: false,
    },
    async upload(input: UploadInput): Promise<StoredObjectMeta> {
      const body = await bodyToBuffer(input.body);
      await client.send(
        new sdk.PutObjectCommand({
          Bucket: bucket,
          Key: input.key,
          Body: body,
          ContentType: input.contentType,
          Metadata: input.metadata,
        }),
      );
      return {
        key: input.key,
        bucket,
        size: body.byteLength,
        contentType: input.contentType,
        updatedAt: new Date().toISOString(),
      };
    },
    async download(_bucket, key) {
      return downloadObject(_bucket, key);
    },
    async downloadStream(_bucket, key) {
      const data = await downloadObject(_bucket, key);
      return Readable.from([Buffer.from(data)]);
    },
    async delete(_bucket, key) {
      await client.send(new sdk.DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
    async exists(_bucket, key) {
      try {
        await client.send(new sdk.HeadObjectCommand({ Bucket: bucket, Key: key }));
        return true;
      } catch {
        return false;
      }
    },
    async getPresignedUrl(input: PresignedUrlInput) {
      const expiresInSeconds = input.expiresInSeconds ?? 900;
      const command =
        input.method === "PUT"
          ? new sdk.PutObjectCommand({ Bucket: bucket, Key: input.key })
          : new sdk.GetObjectCommand({ Bucket: bucket, Key: input.key });
      const url = await sdk.getSignedUrl(client, command, { expiresIn: expiresInSeconds });
      return {
        url,
        expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
      };
    },
  };
}
