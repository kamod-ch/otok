import { redirect } from "@kamod-ch/otok/server";

export const loader = () => redirect("/crm", 302);
