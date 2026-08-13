/** Test fixtures — not real credentials. */
export const TEST_SUPABASE_URL = "https://your-project.supabase.co";
export const TEST_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQ1MDAwMDAwfQ.test-anon-key";
export const TEST_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2NDUwMDAwMDB9.test-service-role";

export interface MockDatabase {
  public: {
    Tables: {
      projects: {
        Row: { id: string; name: string };
        Insert: { id?: string; name: string };
        Update: { id?: string; name?: string };
      };
    };
  };
}

export type MockAuthHandlers = {
  getSession?: () => Promise<{ data: { session: null }; error: null }>;
  getClaims?: () => Promise<{ data: { claims: Record<string, unknown> } | null; error: null | { message: string } }>;
  getUser?: () => Promise<{ data: { user: { id: string; email?: string } | null }; error: null | { message: string; status?: number } }>;
  exchangeCodeForSession?: (code: string) => Promise<{ error: null | { message: string; code?: string } }>;
  verifyOtp?: (input: { type: string; token_hash: string }) => Promise<{ error: null | { message: string; code?: string } }>;
  signOut?: () => Promise<{ error: null | { message: string } }>;
};

export function createMockSupabaseClient(handlers: MockAuthHandlers = {}) {
  return {
    auth: {
      getSession: handlers.getSession ?? (async () => ({ data: { session: null }, error: null })),
      getClaims:
        handlers.getClaims ??
        (async () => ({
          data: { claims: { sub: "user-1", email: "user@example.com", role: "authenticated" } },
          error: null,
        })),
      getUser:
        handlers.getUser ??
        (async () => ({ data: { user: { id: "user-1", email: "user@example.com" } }, error: null })),
      exchangeCodeForSession:
        handlers.exchangeCodeForSession ?? (async () => ({ error: null })),
      verifyOtp: handlers.verifyOtp ?? (async () => ({ error: null })),
      signOut: handlers.signOut ?? (async () => ({ error: null })),
    },
    from(table: string) {
      return {
        select: () => ({
          data: table === "projects" ? [{ id: "p1", name: "Alpha" }] : [],
          error: null,
        }),
      };
    },
  };
}
