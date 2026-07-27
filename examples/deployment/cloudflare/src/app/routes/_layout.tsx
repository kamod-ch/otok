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
          <a class="brand" href="/">
            Otok on Cloudflare
          </a>
          <nav>
            <a href="/">Home</a>
            <a href="/about">About</a>
          </nav>
        </header>
        <main data-otok-page>{children}</main>
      </body>
    </html>
  );
}
