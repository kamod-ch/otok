import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { configureStorageApp, getStorageClient, resetStorageClientForTests } from "./plugin.js";
import { resetStorageRuntimeForTests } from "./registry.js";
import { resetTestStorageProvider } from "./providers/test.js";
import { OtokStorageValidationError } from "./errors.js";

const buckets = {
  uploads: {
    name: "uploads",
    maxSizeBytes: 1024,
    allowedMimeTypes: ["image/*"],
  },
};

describe("storage client", () => {
  beforeEach(() => {
    resetStorageRuntimeForTests();
    resetStorageClientForTests();
    resetTestStorageProvider();
  });

  it("uploads and downloads via test provider", async () => {
    await configureStorageApp({} as never, {
      provider: { type: "test" },
      buckets,
    });

    const client = getStorageClient();
    const meta = await client.upload({
      bucket: "uploads",
      key: "avatar.png",
      body: new Uint8Array([1, 2, 3]),
      contentType: "image/png",
    });

    expect(meta.size).toBe(3);
    const data = await client.download("uploads", "avatar.png");
    expect(Array.from(data)).toEqual([1, 2, 3]);
  });

  it("validates mime type and size", async () => {
    await configureStorageApp({} as never, {
      provider: { type: "test" },
      buckets,
    });

    const client = getStorageClient();
    await expect(
      client.upload({
        bucket: "uploads",
        key: "doc.pdf",
        body: new Uint8Array([1]),
        contentType: "application/pdf",
      }),
    ).rejects.toBeInstanceOf(OtokStorageValidationError);

    await expect(
      client.upload({
        bucket: "uploads",
        key: "large.png",
        body: new Uint8Array(2048),
        contentType: "image/png",
      }),
    ).rejects.toBeInstanceOf(OtokStorageValidationError);
  });

  it("creates presigned urls in test provider", async () => {
    await configureStorageApp({} as never, {
      provider: { type: "test" },
      buckets,
    });

    const client = getStorageClient();
    const presigned = await client.getPresignedUrl({
      bucket: "uploads",
      key: "avatar.png",
    });
    expect(presigned.url).toContain("test://uploads/avatar.png");
  });
});

describe("local provider", () => {
  let rootDir = "";

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), "otok-storage-"));
  });

  afterEach(async () => {
    if (rootDir) await rm(rootDir, { recursive: true, force: true });
  });

  it("persists files on disk", async () => {
    const { createLocalStorageProvider } = await import("./providers/local.js");
    const provider = await createLocalStorageProvider({ type: "local", rootDir });
    await provider.upload({
      bucket: "uploads",
      key: "hello.txt",
      body: new TextEncoder().encode("hello"),
      contentType: "text/plain",
    });
    const data = await provider.download("uploads", "hello.txt");
    expect(new TextDecoder().decode(data)).toBe("hello");
  });
});

describe("storage plugin", () => {
  it("validates bucket configuration", async () => {
    await expect(
      configureStorageApp({} as never, {
        provider: { type: "test" },
        buckets: {},
      }),
    ).rejects.toThrow(/bucket/);
  });
});
