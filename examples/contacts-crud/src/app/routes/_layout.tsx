import type { OtokLayoutProps } from "@kamod-ch/otok/server";

export default function Layout({ children }: OtokLayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Contacts CRUD</title>
      </head>
      <body style="font-family:system-ui,sans-serif;max-width:48rem;margin:2rem auto;padding:0 1rem;">
        <nav style="margin-bottom:2rem;">
          <a href="/contacts" style="font-weight:600;">Contacts CRUD</a>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
