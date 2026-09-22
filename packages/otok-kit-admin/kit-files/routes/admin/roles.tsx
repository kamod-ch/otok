import { getAdminDirectory } from "../../data/admin-runtime.js";

export const loader = () => ({ roles: getAdminDirectory().listRoles() });

export default function AdminRolesPage({ data }: { data: ReturnType<typeof loader> }) {
  return (
    <section class="space-y-4">
      <h1 class="text-2xl font-semibold">Roles</h1>
      <ul>
        {data.roles.map((role) => (
          <li key={role.id}>
            <strong>{role.name}</strong>
            <span> — {role.permissions.join(", ")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
