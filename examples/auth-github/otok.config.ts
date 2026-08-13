import { defineConfig } from "@kamod-ch/otok";
import auth from "@kamod-ch/otok-auth";
import oauth from "@kamod-ch/otok-oauth";
import type { OAuthAdapter, OAuthProfile } from "@kamod-ch/otok-oauth/adapter";
import { createMemorySessionAdapter } from "@kamod-ch/otok-auth/adapters/memory";

type User = { id: string; email: string; name: string | null; role: string };

const users = new Map<string, User>([
  ["demo", { id: "demo", email: "demo@example.com", name: "Demo", role: "admin" }],
]);

const sessionAdapter = createMemorySessionAdapter<User>({
  resolveUser: ({ session }) => users.get(session.userId) ?? null,
});

const oauthAccounts = new Map<string, User>();

const oauthAdapter: OAuthAdapter<User> = {
  async findOrCreateUser(profile: OAuthProfile) {
    const key = `${profile.provider}:${profile.providerAccountId}`;
    const existing = oauthAccounts.get(key);
    if (existing) return existing;
    const user: User = {
      id: `gh-${profile.providerAccountId}`,
      email: profile.email ?? "unknown@example.com",
      name: profile.name,
      role: "member",
    };
    users.set(user.id, user);
    oauthAccounts.set(key, user);
    return user;
  },
  getUserId: (user) => user.id,
};

export default defineConfig({
  plugins: [
    auth({
      secret: process.env.AUTH_SECRET ?? "dev-secret-at-least-32-characters-long!!",
      session: { cookieName: "otok_session" },
      adapter: sessionAdapter,
      redirectAllowlist: ["/", "/dashboard"],
      getRole: (user) => user.role ?? "user",
    }),
    oauth({
      providers: {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID ?? "replace-me",
          clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "replace-me",
          redirectUri: `${process.env.APP_URL ?? "http://localhost:5173"}/auth/github/callback`,
        },
      },
      adapter: oauthAdapter,
    }),
  ],
});
