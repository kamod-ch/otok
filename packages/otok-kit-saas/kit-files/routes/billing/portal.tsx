import type { OtokActionContext } from "@kamod-ch/otok/server";
import { redirect } from "@kamod-ch/otok/server";
import { DEMO_WORKSPACE_ID, getSaasBilling } from "../../data/saas-runtime.js";

export const loader = async () => {
  const record = await getSaasBilling().getRecord(DEMO_WORKSPACE_ID);
  return {
    hasCustomer: Boolean(record?.stripeCustomerId),
    plan: record?.plan ?? "free",
  };
};

export async function action(_ctx: OtokActionContext) {
  return redirect("/billing?portal=return");
}

export default function BillingPortalPage({ data }: { data: Awaited<ReturnType<typeof loader>> }) {
  return (
    <section class="space-y-4">
      <h1 class="text-2xl font-semibold">Customer portal</h1>
      <p>Plan: {data.plan}</p>
      <form method="post">
        <button type="submit" disabled={!data.hasCustomer}>
          Open Stripe billing portal
        </button>
      </form>
      <p class="text-xs">
        Production apps call <code>createBillingPortalSession</code> from <code>@kamod-ch/otok-stripe</code> and
        redirect to the returned URL.
      </p>
    </section>
  );
}
