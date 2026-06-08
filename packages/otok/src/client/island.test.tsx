import renderToString from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { Island } from "./index.js";

function Counter({ init }: { init: number }) {
  return <button>Count: {init}</button>;
}

describe("Island", () => {
  it("renders an SSR marker with encoded props", () => {
    const html = renderToString(<Island component={Counter} props={{ init: 7 }} />);

    expect(html).toContain('data-otok-island="Counter"');
    expect(html).toContain("data-otok-props=");
    expect(html).toContain("Count: 7");
  });
});
