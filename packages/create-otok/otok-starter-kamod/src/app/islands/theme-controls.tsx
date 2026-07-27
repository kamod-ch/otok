import { ThemeToggle } from "@kamod-ch/ui";

export default function ThemeControls() {
  return (
    <div class="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
      <ThemeToggle />
      <span class="text-sm text-muted-foreground">Dark mode uses Otok SSR theme bootstrap + Kamod tokens.</span>
    </div>
  );
}
