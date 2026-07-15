import type { ComponentChildren } from "preact";

export default function Layout({ children }: { children: ComponentChildren }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <header class="site-header" data-otok-swap="shell">
          <a href="/" class="brand">Otok AI Audit</a>
          <nav>
            <a href="/">Dashboard</a>
            <a href="/audits/otok-playground">Sample audit</a>
          </nav>
        </header>
        <main data-otok-page>{children}</main>
      </body>
    </html>
  );
}
