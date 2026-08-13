import { requireSupabaseUser } from "@kamod-ch/otok-supabase/auth";

export default requireSupabaseUser({ redirectTo: "/login", redirectAllowlist: ["/", "/dashboard", "/login"] });
