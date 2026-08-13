import type { OtokLayoutProps } from "@kamod-ch/otok/server";

export default function Layout({ children, chrome }: OtokLayoutProps) {
  return (
    <div>
      <header>
        <h1>{chrome?.title ?? "Otok App"}</h1>
        {chrome?.description ? <p>{chrome.description}</p> : null}
      </header>
      <main>{children}</main>
    </div>
  );
}
