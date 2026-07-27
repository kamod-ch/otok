import type { Plugin } from "vite";

export async function createKamodTailwindPlugin(): Promise<Plugin | Plugin[]> {
  try {
    const mod = await import("@tailwindcss/vite");
    return mod.default();
  } catch {
    throw new Error(
      "otok-kamod: could not load @tailwindcss/vite. " +
        "Install tailwindcss and @tailwindcss/vite in your app:\n" +
        "  pnpm add -D tailwindcss @tailwindcss/vite",
    );
  }
}
