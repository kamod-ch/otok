import { ADMIN_PERMISSIONS, type AdminPermission } from "../permissions.js";

export interface AdminRole {
  id: string;
  name: string;
  permissions: AdminPermission[];
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  roleId: string;
  active: boolean;
}

export class AdminDirectory {
  private roles = new Map<string, AdminRole>();
  private users = new Map<string, AdminUser>();
  private seq = 1;

  constructor() {
    this.upsertRole({
      id: "role-admin",
      name: "Admin",
      permissions: Object.values(ADMIN_PERMISSIONS),
    });
    this.upsertRole({
      id: "role-member",
      name: "Member",
      permissions: [ADMIN_PERMISSIONS.USERS_READ, ADMIN_PERMISSIONS.ORG_READ],
    });
  }

  listRoles(): AdminRole[] {
    return [...this.roles.values()];
  }

  getRole(id: string): AdminRole | undefined {
    return this.roles.get(id);
  }

  upsertRole(role: AdminRole): AdminRole {
    this.roles.set(role.id, role);
    return role;
  }

  listUsers(): AdminUser[] {
    return [...this.users.values()];
  }

  getUser(id: string): AdminUser | undefined {
    return this.users.get(id);
  }

  createUser(input: { email: string; name: string; roleId: string }): AdminUser {
    const role = this.roles.get(input.roleId);
    if (!role) throw new Error(`Unknown role: ${input.roleId}`);
    const user: AdminUser = {
      id: `user-${this.seq++}`,
      email: input.email,
      name: input.name,
      roleId: input.roleId,
      active: true,
    };
    this.users.set(user.id, user);
    return user;
  }

  setUserActive(id: string, active: boolean): AdminUser | undefined {
    const user = this.users.get(id);
    if (!user) return undefined;
    const next = { ...user, active };
    this.users.set(id, next);
    return next;
  }
}
