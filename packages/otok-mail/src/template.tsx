import { h } from "preact";
import renderToString from "preact-render-to-string";
import type { MailTemplateComponent, MailTemplateProps } from "./types.js";

export function renderMailTemplate<P extends MailTemplateProps>(
  template: MailTemplateComponent<P>,
  props: P,
): string {
  const html = renderToString(h(template, props));
  return `<!DOCTYPE html><html><body>${html}</body></html>`;
}
