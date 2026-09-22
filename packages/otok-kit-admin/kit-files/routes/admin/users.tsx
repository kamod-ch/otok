import type { OtokActionContext } from "@kamod-ch/otok/server";
import { getAdminDirectory } from "../../data/admin-runtime.js";

export const loader = () => {
  const admin = getAdminDirectory();
  return { users: admin.listUsers(), roles: admin.listRoles() };
};

export async function action({ formData }: OtokActionContext) {
  const email = String(formData?.get("email") ?? "").trim();
  const name = String(formData?.get("name") ?? "").trim();
  const roleId = String(formData?.get("roleId") ?? "role-member");
  if (!email || !name) return { ok: false as const, error: "email and name required" };
  getAdminDirectory().createUser({ email, name, roleId });
  return { ok: true as const };
}

export default function AdminUsersPage({ data }: { data: ReturnType<typeof loader> }) {
  return (
    <section class="space-y-6">
      <h1 class="text-2xl font-semibold">Users</h1>
      <form method="post" class="flex flex-wrap gap-2">
        <input name="email" type="email" placeholder="email" required />
        <input name="name" placeholder="name" required />
        <select name="roleId">
          {data.roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        <button type="submit">Add user</button>
      </form>
      <ul>
        {data.users.map((user) => (
          <li key={user.id}>
            {user.name} ({user.email}) — {user.roleId} {user.active ? "" : "(inactive)"}
          </li>
        ))}
      </ul>
    </section>
  );
}
