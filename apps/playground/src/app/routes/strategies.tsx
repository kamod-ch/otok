import { Island } from "otok/client";
import StrategyLab from "../islands/strategy-lab";

const largePayload = Array.from({ length: 2600 }, (_, index) => (index % 10).toString()).join("");

export const head = () => ({
  title: "Island strategies | Otok Playground",
  description: "Hydration strategy coverage for Otok islands.",
});

export const chrome = () => ({
  title: "Island strategies",
  description: "load, idle, visible, media, client-only, and large props.",
});

export default function StrategiesPage() {
  return (
    <section class="space-y-8">
      <div>
        <p class="text-sm font-medium text-sky-600 dark:text-sky-300">Hydration strategies</p>
        <h2 class="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Island strategies</h2>
      </div>

      <Island component={StrategyLab} props={{ label: "load" }} strategy="load" />
      <Island component={StrategyLab} props={{ label: "idle" }} strategy="idle" />
      <Island component={StrategyLab} props={{ label: "visible" }} strategy="visible" rootMargin="200px" />
      <Island component={StrategyLab} props={{ label: "media" }} strategy="media" media="(min-width: 1px)" />
      <Island component={StrategyLab} props={{ label: "client-only" }} strategy="client-only" />
      <Island component={StrategyLab} props={{ label: "large props", payload: largePayload }} strategy="load" />
    </section>
  );
}
