import { redirect } from "@kamod-ch/otok/server";

export const loader = () => {
  redirect("/jobs", 302);
};

export default function IndexRedirect() {
  return null;
}
