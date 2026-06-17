import { ThemeToggle } from "@kamod-ui/core";

export default function ThemeIsland() {
  return (
    <div class="flex items-center gap-3">
      <ThemeToggle />
      <span class="text-sm text-muted-foreground">Toggle dark mode</span>
    </div>
  );
}
