import { defineAction, defineLoader, defineMeta } from "otok/route";

interface Company {
  id: string;
  name: string;
}

const companies = new Map<string, Company>([["acme", { id: "acme", name: "Acme GmbH" }]]);

export const loader = defineLoader(async ({ params }) => {
  const company = companies.get(params.companyId);
  if (!company) throw new Response("Not found", { status: 404 });
  return { company };
});

export const action = defineAction({
  schema: {
    parse(value: unknown) {
      const input = value as { name?: string };
      if (!input.name?.trim()) throw new Error("name required");
      return { name: input.name.trim() };
    },
  },
  handler: async ({ input, params }) => {
    const company = companies.get(params.companyId);
    if (!company) throw new Response("Not found", { status: 404 });
    company.name = input.name;
    companies.set(params.companyId, company);
    return { company };
  },
});

export const head = defineMeta(({ data }) => ({
  title: data.company.name,
}));

export default function CompanyPage({ loaderData, actionData }: Route.ComponentProps) {
  const company = actionData && "company" in actionData ? actionData.company : loaderData.company;
  return (
    <main>
      <h1>{company.name}</h1>
      <form method="post">
        <input name="name" defaultValue={company.name} />
        <button type="submit">Save</button>
      </form>
    </main>
  );
}
