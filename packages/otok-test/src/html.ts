/**
 * Lightweight HTML helpers for SSR assertions without a DOM library dependency.
 * Supports simple selectors: tag, #id, .class, [attr], [attr="value"], and combinations.
 */

export interface ParsedElement {
  tagName: string;
  outerHTML: string;
  textContent: string;
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
}

export interface ParsedHtml {
  html: string;
  querySelector(selector: string): ParsedElement | null;
  querySelectorAll(selector: string): ParsedElement[];
  getText(selector?: string): string;
  getAttribute(selector: string, name: string): string | null;
  getMeta(nameOrProperty: string): string | null;
  getTitle(): string | null;
  contains(text: string): boolean;
}

interface MatchResult {
  tagName: string;
  start: number;
  end: number;
  attributes: Record<string, string>;
  outerHTML: string;
  innerHTML: string;
}

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

function decodeEntities(value: string): string {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function parseAttributes(raw: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const attrRe = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  for (const match of raw.matchAll(attrRe)) {
    const name = match[1].toLowerCase();
    attributes[name] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attributes;
}

function findClosingTag(html: string, tagName: string, fromIndex: number): number {
  const openRe = new RegExp(`<${tagName}\\b[^>]*>`, "gi");
  const closeRe = new RegExp(`</${tagName}\\s*>`, "gi");
  openRe.lastIndex = fromIndex;
  closeRe.lastIndex = fromIndex;
  let depth = 1;
  while (depth > 0) {
    const open = openRe.exec(html);
    const close = closeRe.exec(html);
    if (!close) return -1;
    if (open && open.index < close.index) {
      depth += 1;
      closeRe.lastIndex = openRe.lastIndex;
      continue;
    }
    depth -= 1;
    if (depth === 0) return close.index + close[0].length;
    openRe.lastIndex = closeRe.lastIndex;
  }
  return -1;
}

function findElements(html: string, tagName?: string): MatchResult[] {
  const results: MatchResult[] = [];
  const tagPattern = tagName ? tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "[a-zA-Z][\\w:-]*";
  const openRe = new RegExp(`<(${tagPattern})(\\s[^>]*)?\\s*/?>`, "gi");

  for (const match of html.matchAll(openRe)) {
    const name = match[1].toLowerCase();
    const start = match.index ?? 0;
    const openEnd = start + match[0].length;
    const attributes = parseAttributes(match[2] ?? "");
    const selfClosing = match[0].endsWith("/>") || VOID_TAGS.has(name);
    let end = openEnd;
    let innerHTML = "";
    if (!selfClosing) {
      const closeEnd = findClosingTag(html, name, openEnd);
      if (closeEnd === -1) continue;
      end = closeEnd;
      const closeStart = html.lastIndexOf("</", end);
      innerHTML = html.slice(openEnd, closeStart);
    }
    results.push({
      tagName: name,
      start,
      end,
      attributes,
      outerHTML: html.slice(start, end),
      innerHTML,
    });
  }
  return results;
}

type SelectorPart = {
  tag?: string;
  id?: string;
  classes: string[];
  attrs: Array<{ name: string; value?: string }>;
};

function parseSelector(selector: string): SelectorPart {
  const trimmed = selector.trim();
  if (!trimmed) throw new Error("otok/test: selector must not be empty.");

  const part: SelectorPart = { classes: [], attrs: [] };
  const re = /([.#]?[A-Za-z_][\w-]*)|\[([^\]]+)\]/g;
  let cursor = 0;
  for (const match of trimmed.matchAll(re)) {
    if ((match.index ?? 0) !== cursor) {
      throw new Error(`otok/test: unsupported selector "${selector}".`);
    }
    cursor = (match.index ?? 0) + match[0].length;
    const token = match[1];
    const attr = match[2];
    if (attr !== undefined) {
      const eq = attr.indexOf("=");
      if (eq === -1) {
        part.attrs.push({ name: attr.trim().toLowerCase() });
      } else {
        const name = attr.slice(0, eq).trim().toLowerCase();
        let value = attr.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        part.attrs.push({ name, value: decodeEntities(value) });
      }
      continue;
    }
    if (!token) continue;
    if (token.startsWith("#")) part.id = token.slice(1);
    else if (token.startsWith(".")) part.classes.push(token.slice(1));
    else part.tag = token.toLowerCase();
  }

  if (cursor !== trimmed.length) {
    throw new Error(`otok/test: unsupported selector "${selector}".`);
  }

  return part;
}

function matchesSelector(element: MatchResult, selector: SelectorPart): boolean {
  if (selector.tag && element.tagName !== selector.tag) return false;
  if (selector.id && element.attributes.id !== selector.id) return false;
  if (selector.classes.length > 0) {
    const classList = new Set((element.attributes.class ?? "").split(/\s+/).filter(Boolean));
    if (!selector.classes.every((cls) => classList.has(cls))) return false;
  }
  for (const attr of selector.attrs) {
    if (!(attr.name in element.attributes)) return false;
    if (attr.value !== undefined && element.attributes[attr.name] !== attr.value) return false;
  }
  return true;
}

function toParsedElement(match: MatchResult): ParsedElement {
  return {
    tagName: match.tagName,
    outerHTML: match.outerHTML,
    textContent: stripTags(match.innerHTML || match.outerHTML),
    getAttribute(name: string) {
      const key = name.toLowerCase();
      return key in match.attributes ? match.attributes[key] : null;
    },
    hasAttribute(name: string) {
      return name.toLowerCase() in match.attributes;
    },
  };
}

export function parseHtml(html: string): ParsedHtml {
  const source = String(html);

  function querySelectorAll(selector: string): ParsedElement[] {
    const parsed = parseSelector(selector);
    return findElements(source, parsed.tag)
      .filter((element) => matchesSelector(element, parsed))
      .map(toParsedElement);
  }

  function querySelector(selector: string): ParsedElement | null {
    return querySelectorAll(selector)[0] ?? null;
  }

  return {
    html: source,
    querySelector,
    querySelectorAll,
    getText(selector?: string) {
      if (!selector) return stripTags(source);
      return querySelector(selector)?.textContent ?? "";
    },
    getAttribute(selector: string, name: string) {
      return querySelector(selector)?.getAttribute(name) ?? null;
    },
    getMeta(nameOrProperty: string) {
      const byName = querySelector(`meta[name="${nameOrProperty}"]`);
      if (byName) return byName.getAttribute("content");
      const byProperty = querySelector(`meta[property="${nameOrProperty}"]`);
      return byProperty?.getAttribute("content") ?? null;
    },
    getTitle() {
      return querySelector("title")?.textContent ?? null;
    },
    contains(text: string) {
      return source.includes(text);
    },
  };
}
