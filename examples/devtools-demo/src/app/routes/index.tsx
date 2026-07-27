import { Island } from "otok/client";
import Counter from "../islands/counter.tsx";

export default function Home() {
  return (
    <main>
      <h1>Devtools demo</h1>
      <p>Run `pnpm dev` and open the Otok Devtools panel.</p>
      <Island component={Counter} props={{ initial: 1 }} strategy="idle" />
    </main>
  );
}

export function loader() {
  return { title: "Devtools demo" };
}

export function head({ data }: { data: { title: string } }) {
  return { title: data.title, lang: "en" };
}
