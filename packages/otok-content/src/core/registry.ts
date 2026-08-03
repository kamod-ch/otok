import type { CollectionDefinition } from "./types.js";
import { isCollectionDefinition } from "./define-collection.js";

export class ContentRegistry {
  private readonly collections = new Map<string, CollectionDefinition>();

  register(name: string, def: CollectionDefinition): void {
    if (!isCollectionDefinition(def)) {
      throw new Error(`otok-content: invalid collection definition for "${name}"`);
    }
    def.name = name;
    this.collections.set(name, def);
  }

  registerAll(collections: Record<string, CollectionDefinition>): void {
    for (const [name, def] of Object.entries(collections)) {
      this.register(name, def);
    }
  }

  get(name: string): CollectionDefinition | undefined {
    return this.collections.get(name);
  }

  has(name: string): boolean {
    return this.collections.has(name);
  }

  names(): string[] {
    return [...this.collections.keys()].sort();
  }

  entries(): Map<string, CollectionDefinition> {
    return new Map(this.collections);
  }
}

export function createRegistry(collections: Record<string, CollectionDefinition>): ContentRegistry {
  const registry = new ContentRegistry();
  registry.registerAll(collections);
  return registry;
}
