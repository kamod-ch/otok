import { useState } from "preact/hooks";

export default function Counter({ init = 0 }: { init?: number }) {
  const [count, setCount] = useState(init);

  return (
    <div>
      <p>Count: {count}</p>
      <button type="button" onClick={() => setCount((current) => current + 1)}>
        Increment
      </button>
    </div>
  );
}
