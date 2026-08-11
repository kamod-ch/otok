import { defineAction, defineLoader, defineMeta, type RouteComponentProps } from "otok/route";

type Company = {
  id: string;
  name: string;
};

const companies = new Map<string, Company>([["acme", { id: "acme", name: "Acme GmbH" }]]);

export const loader = defineLoader(async ({ params }) => {
  const company = companies.get(params.companyId);
  if (!company) throw new Response("Not found", { status: 404 });
  return { company };
});

const nameSchema = {
  parse(value: unknown) {
    const input = value as { name?: string };
    if (!input.name?.trim()) throw new Error("name required");
    return { name: input.name.trim() };
  },
};

type LoaderData = Awaited<ReturnType<typeof loader>>;
type ActionData = { company: Company };

export const action = defineAction<typeof nameSchema, { params: { companyId: string } }, ActionData>({
  schema: nameSchema,
  handler: async ({ input, params }) => {
    const company = companies.get(params.companyId);
    if (!company) throw new Response("Not found", { status: 404 });
    const { name } = input as { name: string };
    company.name = name;
    companies.set(params.companyId, company);
    return { company };
  },
});

export const head = defineMeta<LoaderData>(({ data }) => ({
  title: data.company.name,
}));

export default function CompanyPage({ loaderData, actionData }: RouteComponentProps<LoaderData, ActionData>) {
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
