import { defineConfig } from "otok";
import kysely from "@kamod-ch/otok-kysely";

export default defineConfig({
  plugins: [
    kysely({
      dialect: "sqlite",
      connectionString: process.env.DATABASE_URL ?? "sqlite://./data/contacts.db",
    }),
  ],
});
