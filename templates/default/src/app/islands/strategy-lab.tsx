import { useState } from "preact/hooks";

type StrategyLabProps = {
  label: string;
  payload?: string;
};

export default function StrategyLab({ label, payload = "" }: StrategyLabProps) {
  const [count, setCount] = useState(0);

  return (
    <section aria-label={`${label} island`} data-payload={payload}>
      <p>{label} hydrated</p>
      {payload ? <p>Payload length: {payload.length}</p> : null}
      <button type="button" onClick={() => setCount((value) => value + 1)}>
        {label} count {count}
      </button>
    </section>
  );
}
