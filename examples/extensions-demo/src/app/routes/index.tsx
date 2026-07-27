import { getMailClient } from "@kamod-ch/otok-mail";
import { getQueueClient } from "@kamod-ch/otok-queue";
import { getStorageClient } from "@kamod-ch/otok-storage";
import { stripeCheckoutAction } from "@kamod-ch/otok-stripe";

export async function loader() {
  const mail = getMailClient();
  await mail.send({
    to: "demo@example.com",
    subject: "Extensions demo loaded",
    text: "All four official extensions are registered.",
  });

  await getStorageClient().upload({
    bucket: "uploads",
    key: "demo.txt",
    body: new TextEncoder().encode("hello extensions"),
    contentType: "text/plain",
  });

  await getQueueClient().enqueue("send-welcome-email", { to: "demo@example.com" });

  const checkout = await stripeCheckoutAction({
    plan: "launch",
    priceId: "price_demo",
    workspaceId: "ws_demo",
    userId: "user_demo",
    successUrl: "http://localhost:5173/?checkout=success",
    cancelUrl: "http://localhost:5173/?checkout=cancel",
  });

  return {
    title: "Official Extensions Demo",
    checkoutUrl: checkout.url,
    mailPreview: "/__otok-mail/preview",
  };
}

export default function IndexPage({ data }: { data: Awaited<ReturnType<typeof loader>> }) {
  return (
    <main>
      <h1>{data.title}</h1>
      <p>Checkout URL (test provider): <a href={data.checkoutUrl}>{data.checkoutUrl}</a></p>
      <p>Mail preview: <a href={data.mailPreview}>{data.mailPreview}</a></p>
    </main>
  );
}
