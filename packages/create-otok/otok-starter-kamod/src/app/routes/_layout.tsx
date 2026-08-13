import type { OtokLayoutProps } from "@kamod-ch/otok/server";

export default function Layout({ children, chrome }: OtokLayoutProps) {
  return (
    <div class="min-h-screen bg-background text-foreground">
      <header class="border-b px-6 py-4">
        <h1 class="text-lg font-semibold">{chrome?.title ?? "Otok + Kamod"}</h1>
        {chrome?.description ? <p class="text-sm text-muted-foreground">{chrome.description}</p> : null}
      </header>
      {children}
    </div>
  );
}
