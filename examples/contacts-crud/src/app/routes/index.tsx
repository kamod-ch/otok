import { redirect } from "otok/server";

export function loader() {
  redirect("/contacts");
}

export default function Home() {
  return null;
}
