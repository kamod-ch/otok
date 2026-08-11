import "../../styles.css";
import type { ComponentChildren } from "preact";

export default function Layout({ children }: { children: ComponentChildren }) {
  return <>{children}</>;
}
