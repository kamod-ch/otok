import { Button } from "@kamod-ui/core";
import { useState } from "preact/hooks";

export default function Counter({ init = 0 }: { init?: number }) {
  const [count, setCount] = useState(init);

  return (
    <div class="flex items-center gap-4">
      <p class="text-sm text-muted-foreground">Count: {count}</p>
      <Button onClick={() => setCount((current) => current + 1)}>Increment</Button>
    </div>
  );
}
