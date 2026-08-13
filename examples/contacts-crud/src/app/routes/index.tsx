import { redirect } from "@kamod-ch/otok/server";

export function loader() {
  redirect("/contacts");
}

export default function Home() {
  return null;
}
