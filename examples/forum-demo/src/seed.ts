import { randomUUID } from "node:crypto";
import { buildThreadSlug } from "@kamod-ch/otok-forum";
import { forumStorage } from "./lib/db.js";

const storage = forumStorage;

const categories = [
  { slug: "otok-framework", name: "Otok Framework", description: "Diskussionen rund um Otok" },
  { slug: "showcase", name: "Showcase", description: "Projekte und Demos" },
  { slug: "support", name: "Hilfe und Support", description: "Fragen und Antworten" },
];

const seeded = [];
for (const cat of categories) {
  seeded.push(await storage.categories.create({ ...cat, sortOrder: seeded.length }));
}

const ts = new Date().toISOString();
const threads = [
  { cat: 0, title: "Willkommen im Otok Forum", author: "admin", content: "Willkommen! Dies ist ein Demo-Forum." },
  { cat: 0, title: "SSR ohne JavaScript", author: "alice", content: "Das Forum funktioniert komplett serverseitig." },
  { cat: 1, title: "Mein erstes Otok-Projekt", author: "alice", content: "Teilt eure Showcase-Projekte hier." },
];

for (const t of threads) {
  const threadId = randomUUID();
  const postId = randomUUID();
  const slug = buildThreadSlug(threadId, t.title);
  await storage.threads.create({
    id: threadId,
    categoryId: seeded[t.cat]!.id,
    authorId: t.author,
    title: t.title,
    slug,
    createdAt: ts,
    updatedAt: ts,
  });
  await storage.posts.create({
    id: postId,
    threadId,
    authorId: t.author,
    contentMarkdown: t.content,
    contentHtml: `<p>${t.content}</p>`,
    createdAt: ts,
    updatedAt: ts,
  });
  await storage.threads.update(threadId, { postCount: 1, lastPostId: postId, lastPostAt: ts });
}

console.info("Seeded forum demo:", seeded.map((c) => c.name).join(", "));
