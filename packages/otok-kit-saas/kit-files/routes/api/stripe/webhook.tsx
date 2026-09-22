import type { OtokActionContext } from "@kamod-ch/otok/server";
import { dispatchSaasStripeEvent, processWebhookEventIdempotently } from "@kamod-ch/otok-kit-saas";
import { getSaasBilling, getSaasWebhookStore } from "../../../data/saas-runtime.js";

export async function action({ request }: OtokActionContext) {
  const payload = (await request.json()) as {
    id?: string;
    type?: string;
    data?: { object?: Record<string, unknown> };
  };
  if (!payload.id || !payload.type || !payload.data?.object) {
    return new Response(JSON.stringify({ error: "invalid_event" }), { status: 400 });
  }
  const { duplicate, result } = await processWebhookEventIdempotently(getSaasWebhookStore(), payload.id, () =>
    dispatchSaasStripeEvent(getSaasBilling(), {
      type: payload.type!,
      data: { object: payload.data!.object! },
    }),
  );
  return { received: true, duplicate, workspaceId: result?.workspaceId ?? null };
}

export default function StripeWebhookProbe() {
  return (
    <section>
      <h1>Stripe webhook</h1>
      <p>
        POST JSON Stripe-like events to this route. Prefer `createStripeWebhookHandler` from `@kamod-ch/otok-stripe` in
        production for signature verification.
      </p>
    </section>
  );
}
