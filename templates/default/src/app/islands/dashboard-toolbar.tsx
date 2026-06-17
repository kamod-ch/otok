import {
  Button,
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  ThemeToggle,
} from "@kamod-ui/core";
import { useEffect, useState } from "preact/hooks";

const commands = [
  { label: "Classic Dashboard", href: "/" },
  { label: "Zero-JS route", href: "/about" },
  { label: "kamod-ui islands", href: "/demo" },
  { label: "Dynamic route", href: "/users/alice" },
];

export default function DashboardToolbar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        class="hidden h-8 w-64 justify-start text-muted-foreground sm:flex"
        onClick={() => setOpen(true)}
      >
        Search for a command to run...
        <kbd class="pointer-events-none ms-auto hidden rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:inline">
          ⌘K
        </kbd>
      </Button>
      <Button variant="outline" size="sm" class="sm:hidden" onClick={() => setOpen(true)}>
        Search
      </Button>
      <ThemeToggle />
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder="Search for a command to run..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Pages">
              {commands.map((command) => (
                <CommandItem
                  key={command.href}
                  value={command.label}
                  onSelect={() => {
                    setOpen(false);
                    window.location.href = command.href;
                  }}
                >
                  {command.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
