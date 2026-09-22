import type { OtokActionContext } from "@kamod-ch/otok/server";
import { redirect } from "@kamod-ch/otok/server";
import { createCheckoutIntent } from "@kamod-ch/otok-kit-saas";
import { DEMO_WORKSPACE_ID, getSaasBilling } from "../../data/saas-runtime.js";

export const loader = async () => {
  const record = await getSaasBilling().getRecord(DEMO_WORKSPACE_ID);
  return {
    workspaceId: DEMO_WORKSPACE_ID,
    plan: record?.plan ?? "free",
    status: record?.status ?? "none",
  };
};

export async function action({ formData }: OtokActionContext) {
  const plan = String(formData?.get("plan") ?? "");
  if (plan !== "launch" && plan !== "pro") {
    return { ok: false as const, error: "Choose launch or pro." };
  }
  const intent = createCheckoutIntent({ workspaceId: DEMO_WORKSPACE_ID, plan });
  return redirect(intent.successUrl);
}

export default function BillingPage({ data }: { data: Awaited<ReturnType<typeof loader>> }) {
  return (
    <section class="space-y-6">
      <header>
        <h1 class="text-2xl font-semibold">Billing</h1>
        <p class="text-sm">
          Current plan: <strong>{data.plan}</strong> ({data.status})
        </p>
      </header>
      <form method="post" class="flex gap-3">
        <button name="plan" value="launch" type="submit">
          Checkout Launch
        </button>
        <button name="plan" value="pro" type="submit">
          Checkout Pro
        </button>
      </form>
      <p>
        <a href="/billing/portal">Customer portal</a>
      </p>
      <p class="text-xs">
        Wire <code>createCheckoutSession</code> from <code>@kamod-ch/otok-stripe</code> in production.
      </p>
    </section>
  );
}
