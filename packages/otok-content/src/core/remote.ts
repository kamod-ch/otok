import type { RemoteContentSource, RemoteContentFile } from "./types.js";

/** In-memory remote source for tests and custom adapters. */
export class MemoryRemoteSource implements RemoteContentSource {
  readonly name: string;
  private readonly files = new Map<string, RemoteContentFile>();

  constructor(name: string, files: RemoteContentFile[] = []) {
    this.name = name;
    for (const file of files) {
      this.files.set(file.path, file);
    }
  }

  async list(collection: string): Promise<RemoteContentFile[]> {
    const prefix = `${collection}/`;
    return [...this.files.entries()]
      .filter(([path]) => path.startsWith(prefix))
      .map(([, file]) => file);
  }
}

export interface RemoteSourceAdapter {
  /** Fetch remote files and merge with local scan at build time. */
  fetch(collection: string): Promise<RemoteContentFile[]>;
}
