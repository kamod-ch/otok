import type { CollectionDefinition } from "@kamod-ch/otok-content";
import { blogPreset } from "@kamod-ch/otok-content/presets";

declare const posts: CollectionDefinition;
declare const entries: Awaited<ReturnType<typeof import("@kamod-ch/otok-content/runtime").getCollection>>;
declare const post: Awaited<ReturnType<typeof import("@kamod-ch/otok-content/runtime").getEntry>>;

// Preset collections are typed
const _posts = blogPreset.posts;

// Entry data is inferred from schema when using generic helpers
type PostData = typeof _posts extends CollectionDefinition<infer S> ? import("zod").output<S> : never;

const _published: PostData["published"] = true;

export type { PostData };
