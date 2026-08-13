import { defineConfig } from "otok";
import supabase from "@kamod-ch/otok-supabase";

const supabaseUrl = process.env.SUPABASE_URL ?? "https://your-project.supabase.co";
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? "your-publishable-key";

export default defineConfig({
  plugins: [
    supabase({
      url: supabaseUrl,
      publishableKey,
      cookieOptions: {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
      authRoutes: {
        successRedirect: "/dashboard",
        errorRedirect: "/login",
        redirectAllowlist: ["/", "/dashboard", "/login"],
      },
    }),
  ],
});
