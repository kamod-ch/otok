import { redirect } from "@kamod-ch/otok/server";

export const loader = () => redirect("/articles", 302);

export default function Index() {
  return null;
}
