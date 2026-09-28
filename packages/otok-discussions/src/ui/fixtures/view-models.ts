import type { DiscussionViewModel } from "../types.js";

const baseThread = {
  id: "thread-fixture",
  title: "Produktfeedback Q3",
  status: "open" as const,
  replyCount: 3,
};

const longNameAuthor = {
  id: "user-long",
  displayName: "Dr. Maximilian Alexander von und zu Hohensteinberger",
  avatarUrl: undefined,
};

export const discussionFixtureViewModels: Record<string, DiscussionViewModel> = {
  loading: {
    shell: "loading",
    layout: "preview",
    viewer: { isAuthenticated: false },
    comments: [],
    urls: {},
  },
  empty: {
    shell: "ready",
    layout: "thread",
    thread: { ...baseThread, replyCount: 0 },
    viewer: { isAuthenticated: true, userId: "user-1" },
    comments: [],
    urls: { login: "/login" },
    form: { actionUrl: "/discussions/job-1/thread", intent: "comment", idempotencyKey: "comment-create" },
  },
  openGuest: {
    shell: "ready",
    layout: "preview",
    thread: baseThread,
    viewer: { isAuthenticated: false },
    comments: [
      {
        id: "c1",
        author: { id: "a1", displayName: "Sam", avatarUrl: "https://example.com/a.png" },
        bodyMarkdown: "Kurzer Kommentar.",
        createdAt: "2026-06-01T10:00:00.000Z",
        status: "published",
        isPlaceholder: false,
        scorePositive: 4,
        scoreNegative: 1,
      },
    ],
    urls: { fullDiscussion: "/discussions/job-1/thread", login: "/login" },
  },
  openSignedIn: {
    shell: "ready",
    layout: "thread",
    thread: baseThread,
    viewer: { isAuthenticated: true, userId: "user-1" },
    comments: [
      {
        id: "c2",
        author: longNameAuthor,
        bodyMarkdown: "Ein sehr langes Wort: Supercalifragilisticexpialidocious\n\nMehrzeiliger\nKommentar.",
        createdAt: "2026-06-01T11:00:00.000Z",
        status: "published",
        isPlaceholder: false,
        scorePositive: 12,
        scoreNegative: 0,
        viewerReaction: { emoji: "👍", reactionId: "r1" },
      },
    ],
    urls: { login: "/login" },
    form: {
      actionUrl: "/discussions/job-1/thread",
      csrfToken: "fixture-csrf",
      intent: "comment",
      idempotencyKey: "comment-create",
    },
  },
  scheduled: {
    shell: "ready",
    layout: "thread",
    thread: { ...baseThread, status: "scheduled", opensAt: "2026-07-01T08:00:00.000Z" },
    viewer: { isAuthenticated: true, userId: "user-1" },
    comments: [],
    urls: {},
    form: { actionUrl: "/discussions/job-1/thread", intent: "comment", idempotencyKey: "comment-create" },
  },
  readOnly: {
    shell: "ready",
    layout: "thread",
    thread: { ...baseThread, status: "read_only" },
    viewer: { isAuthenticated: true, userId: "user-1" },
    comments: [
      {
        id: "c3",
        author: { id: "a2", displayName: "Lee" },
        bodyMarkdown: "Archivierte Diskussion — nur Lesen.",
        createdAt: "2026-05-01T09:00:00.000Z",
        status: "published",
        isPlaceholder: false,
        scorePositive: 2,
        scoreNegative: 2,
      },
    ],
    urls: {},
    form: { actionUrl: "/discussions/job-1/thread", intent: "comment", idempotencyKey: "comment-create" },
  },
  closed: {
    shell: "ready",
    layout: "thread",
    thread: { ...baseThread, status: "closed" },
    viewer: { isAuthenticated: true, userId: "user-1" },
    comments: [],
    urls: {},
    form: { actionUrl: "/discussions/job-1/thread", intent: "comment", idempotencyKey: "comment-create" },
  },
  error: {
    shell: "error",
    layout: "thread",
    viewer: { isAuthenticated: false },
    comments: [],
    urls: {},
    errorMessage: "Netzwerkfehler — bitte später erneut versuchen.",
  },
  ownPending: {
    shell: "ready",
    layout: "thread",
    thread: baseThread,
    viewer: { isAuthenticated: true, userId: "user-1" },
    comments: [
      {
        id: "c-pending",
        author: { id: "user-1", displayName: "Du" },
        bodyMarkdown: "Noch nicht freigegeben.",
        createdAt: "2026-06-01T12:30:00.000Z",
        status: "pending",
        isPlaceholder: false,
        scorePositive: 0,
        scoreNegative: 0,
      },
    ],
    urls: {},
    form: { actionUrl: "/discussions/job-1/thread", intent: "comment", idempotencyKey: "comment-create" },
  },
  moderatedPlaceholder: {
    shell: "ready",
    layout: "thread",
    thread: baseThread,
    viewer: { isAuthenticated: false },
    comments: [
      {
        id: "c-mod",
        author: { id: "removed", displayName: "Entfernt" },
        bodyMarkdown: "",
        createdAt: "2026-06-01T08:00:00.000Z",
        status: "deleted",
        isPlaceholder: true,
        scorePositive: 0,
        scoreNegative: 0,
      },
    ],
    urls: { fullDiscussion: "/discussions/job-1/thread" },
  },
};

export const discussionFixtureKeys = Object.keys(discussionFixtureViewModels);
