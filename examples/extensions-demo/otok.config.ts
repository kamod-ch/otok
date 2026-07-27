import { defineConfig } from "otok";
import mail from "@kamod-ch/otok-mail";
import storage from "@kamod-ch/otok-storage";
import queue from "@kamod-ch/otok-queue";
import stripe from "@kamod-ch/otok-stripe";

type Jobs = {
  "send-welcome-email": { to: string };
};

export default defineConfig({
  plugins: [
    mail({
      provider: { type: "test" },
      defaultFrom: "Extensions Demo <demo@otok.local>",
      preview: true,
    }),
    storage({
      provider: { type: "test" },
      buckets: {
        uploads: {
          name: "uploads",
          maxSizeBytes: 1024 * 1024,
          allowedMimeTypes: ["text/*"],
        },
      },
    }),
    queue<Jobs>({
      provider: { type: "test" },
    }),
    stripe({
      provider: { type: "test" },
    }),
  ],
});
