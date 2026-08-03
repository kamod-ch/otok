import type { CreateCategoryInput, ForumCategory, ForumStorageAdapter } from "../types.js";

export class CategoryService {
  constructor(private readonly storage: ForumStorageAdapter) {}

  create(input: CreateCategoryInput): Promise<ForumCategory> {
    return this.storage.categories.create(input);
  }

  list(): Promise<ForumCategory[]> {
    return this.storage.categories.list();
  }

  findBySlug(slug: string): Promise<ForumCategory | null> {
    return this.storage.categories.findBySlug(slug);
  }

  findById(id: string): Promise<ForumCategory | null> {
    return this.storage.categories.findById(id);
  }
}
