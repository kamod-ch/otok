import renderToString from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { Island } from "./index.js";

function Counter({ init }: { init: number }) {
  return <button>Count: {init}</button>;
}
(Counter as typeof Counter & { __otokIslandId: string }).__otokIslandId = "Counter";

function LargeProps({ text }: { text: string }) {
  return <p>{text.length}</p>;
}
(LargeProps as typeof LargeProps & { __otokIslandId: string }).__otokIslandId = "LargeProps";

describe("Island", () => {
  it("renders an SSR marker with encoded props", () => {
    const html = renderToString(<Island component={Counter} props={{ init: 7 }} />);

    expect(html).toContain('data-otok-island="Counter"');
    expect(html).toContain("data-otok-props=");
    expect(html).toContain("Count: 7");
  });

  it("renders large props in a JSON script payload", () => {
    const html = renderToString(<Island component={LargeProps} props={{ text: "x".repeat(3000) }} />);

    expect(html).toContain('data-otok-props-id="otok-LargeProps"');
    expect(html).toContain('type="application/json"');
    expect(html).toContain('data-otok-props-for="otok-LargeProps"');
  });
});
