import type { Selectable } from "kysely";

export interface UsersTable {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  role: string;
  createdAt: string;
}

export interface SessionsTable {
  id: string;
  userId: string;
  tokenHash: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  lastSeenAt: string | null;
}

export interface ProjectsTable {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaasDatabase {
  users: UsersTable;
  sessions: SessionsTable;
  projects: ProjectsTable;
}

export type SaasUser = Pick<Selectable<UsersTable>, "id" | "email" | "name" | "role">;
export type Project = Selectable<ProjectsTable>;

declare module "kysely" {
  interface Database extends SaasDatabase {}
}
