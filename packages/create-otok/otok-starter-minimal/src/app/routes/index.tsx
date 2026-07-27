import { Island } from "otok/client";
import Counter from "../islands/counter";

export const head = () => ({
  title: "Otok App",
  description: "A minimal Otok starter with one counter island.",
});

export const chrome = () => ({
  title: "Home",
  description: "Minimal Otok starter",
});

export default function Home() {
  return (
    <section>
      <p>Server-rendered page with one interactive island.</p>
      <Island component={Counter} props={{ init: 0 }} />
    </section>
  );
}
