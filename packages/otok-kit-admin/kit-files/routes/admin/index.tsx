import { getAdminDirectory } from "../../data/admin-runtime.js";

export const loader = () => {
  const admin = getAdminDirectory();
  return { userCount: admin.listUsers().length, roleCount: admin.listRoles().length };
};

export default function AdminPage({ data }: { data: ReturnType<typeof loader> }) {
  return (
    <section class="space-y-4">
      <h1 class="text-2xl font-semibold">Admin</h1>
      <p>
        {data.userCount} users · {data.roleCount} roles
      </p>
      <nav class="flex gap-4">
        <a href="/admin/users">Users</a>
        <a href="/admin/roles">Roles</a>
      </nav>
    </section>
  );
}
