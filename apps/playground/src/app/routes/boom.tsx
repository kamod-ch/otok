import { fail } from "otok/server";

export const loader = () => {
  fail("Boom from loader");
};

export default function Boom() {
  return <p>This page should never render.</p>;
}
