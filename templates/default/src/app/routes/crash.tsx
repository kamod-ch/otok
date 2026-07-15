export const loader = () => {
  throw new Error("Secret stack detail");
};

export default function Crash() {
  return <p>This page should never render.</p>;
}
