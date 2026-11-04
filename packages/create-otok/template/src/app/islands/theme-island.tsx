import { ThemeToggle } from "@kamod-ch/ui";

export default function ThemeIsland() {
  return (
    <div class="flex items-center gap-3">
      <ThemeToggle />
      <span class="text-sm text-muted-foreground">Toggle dark mode</span>
    </div>
  );
}
