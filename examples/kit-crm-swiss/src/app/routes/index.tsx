import { redirect } from "otok/server";

export const loader = () => redirect("/crm", 302);
