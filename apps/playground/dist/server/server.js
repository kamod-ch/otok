import { readFileSync } from "node:fs";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { Fragment, h, options } from "preact";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, ThemeToggle } from "@kamod-ui/core";
import { jsx, jsxs } from "preact/jsx-runtime";
import { useState } from "preact/hooks";
//#region \0rolldown/runtime.js
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
//#endregion
//#region ../../node_modules/.pnpm/preact-render-to-string@6.7.0_preact@10.29.2/node_modules/preact-render-to-string/dist/index.mjs
var r = "diffed", o = "__c", i = "__s", a = "__c", c = "__k", u = "__d", s = "__s", l = /[\s\n\\/='"\0<>]/, f = /^(xlink|xmlns|xml)([A-Z])/, p = /^(?:accessK|auto[A-Z]|cell|ch|col|cont|cross|dateT|encT|form[A-Z]|frame|hrefL|inputM|maxL|minL|noV|playsI|popoverT|readO|rowS|src[A-Z]|tabI|useM|item[A-Z])/, h$1 = /^ac|^ali|arabic|basel|cap|clipPath$|clipRule$|color|dominant|enable|fill|flood|font|glyph[^R]|horiz|image|letter|lighting|marker[^WUH]|overline|panose|pointe|paint|rendering|shape|stop|strikethrough|stroke|text[^L]|transform|underline|unicode|units|^v[^i]|^w|^xH/, d = new Set(["draggable", "spellcheck"]);
function v(e) {
	void 0 !== e.__g ? e.__g |= 8 : e[u] = !0;
}
function m(e) {
	void 0 !== e.__g ? e.__g &= -9 : e[u] = !1;
}
function y(e) {
	return void 0 !== e.__g ? !!(8 & e.__g) : !0 === e[u];
}
var _ = /["&<]/;
function g(e) {
	if (0 === e.length || !1 === _.test(e)) return e;
	for (var t = 0, n = 0, r = "", o = ""; n < e.length; n++) {
		switch (e.charCodeAt(n)) {
			case 34:
				o = "&quot;";
				break;
			case 38:
				o = "&amp;";
				break;
			case 60:
				o = "&lt;";
				break;
			default: continue;
		}
		n !== t && (r += e.slice(t, n)), r += o, t = n + 1;
	}
	return n !== t && (r += e.slice(t, n)), r;
}
var b = {}, x = new Set([
	"animation-iteration-count",
	"border-image-outset",
	"border-image-slice",
	"border-image-width",
	"box-flex",
	"box-flex-group",
	"box-ordinal-group",
	"column-count",
	"fill-opacity",
	"flex",
	"flex-grow",
	"flex-negative",
	"flex-order",
	"flex-positive",
	"flex-shrink",
	"flood-opacity",
	"font-weight",
	"grid-column",
	"grid-row",
	"line-clamp",
	"line-height",
	"opacity",
	"order",
	"orphans",
	"stop-opacity",
	"stroke-dasharray",
	"stroke-dashoffset",
	"stroke-miterlimit",
	"stroke-opacity",
	"stroke-width",
	"tab-size",
	"widows",
	"z-index",
	"zoom"
]), k = /[A-Z]/g;
function w(e) {
	var t = "";
	for (var n in e) {
		var r = e[n];
		if (null != r && "" !== r) {
			var o = "-" == n[0] ? n : b[n] || (b[n] = n.replace(k, "-$&").toLowerCase()), i = ";";
			"number" != typeof r || o.startsWith("--") || x.has(o) || (i = "px;"), t = t + o + ":" + r + i;
		}
	}
	return t || void 0;
}
function C() {
	this.__d = !0;
}
function A(e, t) {
	return {
		__v: e,
		context: t,
		props: e.props,
		setState: C,
		forceUpdate: C,
		__d: !0,
		__h: new Array(0)
	};
}
function S(e, t, n) {
	if (!e.s) {
		if (n instanceof L) {
			if (!n.s) return void (n.o = S.bind(null, e, t));
			1 & t && (t = n.s), n = n.v;
		}
		if (n && n.then) return void n.then(S.bind(null, e, t), S.bind(null, e, 2));
		e.s = t, e.v = n;
		const r = e.o;
		r && r(e);
	}
}
var L = /*#__PURE__*/ function() {
	function e() {}
	return e.prototype.then = function(t, n) {
		var r = new e(), o = this.s;
		if (o) {
			var i = 1 & o ? t : n;
			if (i) {
				try {
					S(r, 1, i(this.v));
				} catch (e) {
					S(r, 2, e);
				}
				return r;
			}
			return this;
		}
		return this.o = function(e) {
			try {
				var o = e.v;
				1 & e.s ? S(r, 1, t ? t(o) : o) : n ? S(r, 1, n(o)) : S(r, 2, o);
			} catch (e) {
				S(r, 2, e);
			}
		}, r;
	}, e;
}();
var D, P, $, U, F = {}, M = [], W = Array.isArray, z = Object.assign, H = "", N = "<!--$s-->", q = "<!--/$s-->";
function B(e) {
	return "string" == typeof e ? N + e + q : W(e) ? (e.unshift(N), e.push(q), e) : e && "function" == typeof e.then ? e.then(B) : N + e + q;
}
function I(a, u, s) {
	var l = options[i];
	options[i] = !0, D = options.__b, P = options[r], $ = options.__r, U = options.unmount;
	var f = h(Fragment, null);
	f[c] = [a];
	try {
		var p = R(a, u || F, !1, void 0, f, !1, s);
		return W(p) ? p.join(H) : p;
	} catch (e) {
		if (e.then) throw new Error("Use \"renderToStringAsync\" for suspenseful rendering.");
		throw e;
	} finally {
		options[o] && options[o](a, M), options[i] = l, M.length = 0;
	}
}
function O(e, t) {
	var n, r = e.type, o = !0;
	return e[a] ? (o = !1, (n = e[a]).state = n[s]) : n = new r(e.props, t), e[a] = n, n.__v = e, n.props = e.props, n.context = t, v(n), n.state ?? (n.state = F), n[s] ?? (n[s] = n.state), r.getDerivedStateFromProps ? n.state = z({}, n.state, r.getDerivedStateFromProps(n.props, n.state)) : o && n.componentWillMount ? (n.componentWillMount(), n.state = n[s] !== n.state ? n[s] : n.state) : !o && n.componentWillUpdate && n.componentWillUpdate(), $ && $(e), n.render(n.props, n.state, t);
}
function R(t, r, o, i, u, _, b) {
	if (null == t || !0 === t || !1 === t || t === H) return H;
	var x = typeof t;
	if ("object" != x) return "function" == x ? H : "string" == x ? g(t) : t + H;
	if (W(t)) {
		var k, C = H;
		u[c] = t;
		for (var S = t.length, L = 0; L < S; L++) {
			var E = t[L];
			if (null != E && "boolean" != typeof E) {
				var j, T = R(E, r, o, i, u, _, b);
				"string" == typeof T ? C += T : (k || (k = new Array(S)), C && k.push(C), C = H, W(T) ? (j = k).push.apply(j, T) : k.push(T));
			}
		}
		return k ? (C && k.push(C), k) : C;
	}
	if (void 0 !== t.constructor) return H;
	t.__ = u, D && D(t);
	var Z = t.type, M = t.props;
	if ("function" == typeof Z) {
		var N, q, I, K = r;
		if (Z === Fragment) {
			if ("tpl" in M) {
				for (var G = H, Q = 0; Q < M.tpl.length; Q++) if (G += M.tpl[Q], M.exprs && Q < M.exprs.length) {
					var X = M.exprs[Q];
					if (null == X) continue;
					"object" != typeof X || void 0 !== X.constructor && !W(X) ? G += X : G += R(X, r, o, i, t, _, b);
				}
				return G;
			}
			if ("UNSTABLE_comment" in M) return "<!--" + g(M.UNSTABLE_comment) + "-->";
			q = M.children;
		} else {
			if (null != (N = Z.contextType)) {
				var Y = r[N.__c];
				K = Y ? Y.props.value : N.__;
			}
			var ee = Z.prototype && "function" == typeof Z.prototype.render;
			if (ee) q = O(t, K), I = t[a];
			else {
				t[a] = I = A(t, K);
				for (var te = 0; y(I) && te++ < 25;) {
					m(I), $ && $(t);
					try {
						q = Z.call(I, M, K);
					} catch (e) {
						throw _ && e && "function" == typeof e.then && (t._suspended = !0), e;
					}
				}
				v(I);
			}
			if (null != I.getChildContext && (r = z({}, r, I.getChildContext())), ee && options.errorBoundaries && (Z.getDerivedStateFromError || I.componentDidCatch)) {
				q = null != q && q.type === Fragment && null == q.key && null == q.props.tpl ? q.props.children : q;
				try {
					return R(q, r, o, i, t, _, !1);
				} catch (e) {
					return Z.getDerivedStateFromError && (I[s] = Z.getDerivedStateFromError(e)), I.componentDidCatch && I.componentDidCatch(e, F), y(I) ? (q = O(t, r), null != (I = t[a]).getChildContext && (r = z({}, r, I.getChildContext())), R(q = null != q && q.type === Fragment && null == q.key && null == q.props.tpl ? q.props.children : q, r, o, i, t, _, b)) : H;
				} finally {
					P && P(t), U && U(t);
				}
			}
		}
		q = null != q && q.type === Fragment && null == q.key && null == q.props.tpl ? q.props.children : q;
		try {
			var ne = R(q, r, o, i, t, _, b);
			return P && P(t), options.unmount && options.unmount(t), t._suspended ? B(ne) : ne;
		} catch (n) {
			if (!_ && b && b.onError) {
				var re = function e(n) {
					return b.onError(n, t, function(t, n) {
						try {
							return R(t, r, o, i, n, _, b);
						} catch (t) {
							return e(t);
						}
					});
				}(n);
				if (void 0 !== re) return re;
				var oe = options.__e;
				return oe && oe(n, t), H;
			}
			if (!_) throw n;
			if (!n || "function" != typeof n.then) throw n;
			return n.then(function e() {
				try {
					var n = R(q, r, o, i, t, _, b);
					return t._suspended ? B(n) : n;
				} catch (t) {
					if (!t || "function" != typeof t.then) throw t;
					return t.then(e);
				}
			});
		}
	}
	var ie, ae = "<" + Z, ce = H;
	for (var ue in M) {
		var se = M[ue];
		if ("function" != typeof (se = J(se) ? se.value : se) || "class" === ue || "className" === ue) {
			switch (ue) {
				case "children":
					ie = se;
					continue;
				case "key":
				case "ref":
				case "__self":
				case "__source": continue;
				case "htmlFor":
					if ("for" in M) continue;
					ue = "for";
					break;
				case "className":
					if ("class" in M) continue;
					ue = "class";
					break;
				case "defaultChecked":
					ue = "checked";
					break;
				case "defaultSelected":
					ue = "selected";
					break;
				case "defaultValue":
				case "value":
					switch (ue = "value", Z) {
						case "textarea":
							ie = se;
							continue;
						case "select":
							i = se;
							continue;
						case "option": i != se || "selected" in M || (ae += " selected");
					}
					break;
				case "dangerouslySetInnerHTML":
					ce = se && se.__html;
					continue;
				case "style":
					"object" == typeof se && (se = w(se));
					break;
				case "acceptCharset":
					ue = "accept-charset";
					break;
				case "httpEquiv":
					ue = "http-equiv";
					break;
				default:
					if (l.test(ue)) continue;
					f.test(ue) ? ue = ue.replace(f, "$1:$2").toLowerCase() : "-" !== ue[4] && !d.has(ue) || null == se ? o ? h$1.test(ue) && (ue = "panose1" === ue ? "panose-1" : ue.replace(/([A-Z])/g, "-$1").toLowerCase()) : p.test(ue) && (ue = ue.toLowerCase()) : se += H;
			}
			null != se && !1 !== se && (ae = !0 === se || se === H ? ae + " " + ue : ae + " " + ue + "=\"" + ("string" == typeof se ? g(se) : se + H) + "\"");
		}
	}
	if (l.test(Z)) throw new Error(Z + " is not a valid HTML tag name in " + ae + ">");
	if (ce || ("string" == typeof ie ? ce = g(ie) : null != ie && !1 !== ie && !0 !== ie && (ce = R(ie, r, "svg" === Z || "foreignObject" !== Z && o, i, t, _, b))), P && P(t), U && U(t), !ce && V.has(Z)) return ae + "/>";
	var le = "</" + Z + ">", fe = ae + ">";
	return W(ce) ? [fe].concat(ce, [le]) : "string" != typeof ce ? [
		fe,
		ce,
		le
	] : fe + ce + le;
}
var V = new Set([
	"area",
	"base",
	"br",
	"col",
	"command",
	"embed",
	"hr",
	"img",
	"input",
	"keygen",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr"
]);
function J(e) {
	return null !== e && "object" == typeof e && "function" == typeof e.peek && "value" in e;
}
//#endregion
//#region ../../packages/otok/dist/server/html.js
function escapeHtml(value) {
	return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;");
}
function publicPath(path, base) {
	return `${base.endsWith("/") ? base : `${base}/`}${path}`.replace(/\/{2,}/g, "/");
}
function findEntry(manifest, clientEntry) {
	if (!manifest) return void 0;
	return manifest[clientEntry] ?? manifest[`/${clientEntry}`] ?? manifest[clientEntry.replace(/^\//, "")] ?? Object.values(manifest).find((entry) => entry.isEntry && entry.file?.endsWith(".js"));
}
function collectCss(manifest, entry) {
	if (!manifest || !entry) return [];
	const seen = /* @__PURE__ */ new Set();
	const css = [];
	const visit = (item) => {
		if (!item) return;
		for (const href of item.css ?? []) if (!seen.has(href)) {
			seen.add(href);
			css.push(href);
		}
		for (const imported of item.imports ?? []) visit(manifest[imported]);
	};
	visit(entry);
	return css;
}
function renderHead(head) {
	const title = escapeHtml(head?.title ?? "Otok App");
	const description = head?.description ? `<meta name="description" content="${escapeHtml(head.description)}">` : "";
	const meta = Object.entries(head?.meta ?? {}).map(([name, content]) => `<meta name="${escapeHtml(name)}" content="${escapeHtml(content)}">`).join("\n    ");
	return [
		"<meta charset=\"utf-8\">",
		"<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
		`<title>${title}</title>`,
		description,
		meta
	].filter(Boolean).join("\n    ");
}
function pageHtml({ body, head, islands, manifest, clientEntry = "src/client.ts", devClientEntry = "/src/client.ts", base = "/" }) {
	const entry = findEntry(manifest, clientEntry);
	const stylesheetLinks = collectCss(manifest, entry).map((href) => `<link rel="stylesheet" href="${escapeHtml(publicPath(href, base))}">`).join("\n    ");
	const clientScript = islands.length > 0 ? entry?.file ? `<script type="module" src="${escapeHtml(publicPath(entry.file, base))}"><\/script>` : `<script type="module" src="${escapeHtml(devClientEntry)}"><\/script>` : "";
	return `<!doctype html>
<html lang="${escapeHtml(head?.lang ?? "en")}">
  <head>
    ${renderHead(head)}
    ${stylesheetLinks}
  </head>
  <body>
    ${body}
    ${clientScript}
  </body>
</html>`;
}
//#endregion
//#region ../../packages/otok/dist/server/island-context.js
var activeContext;
function withIslandRenderContext(context, render) {
	const previous = activeContext;
	activeContext = context;
	try {
		return render();
	} finally {
		activeContext = previous;
	}
}
function registerRenderedIsland(id) {
	activeContext?.islands.add(id);
}
//#endregion
//#region ../../packages/otok/dist/server/router.js
function matchRoute(routes, pathname) {
	for (const route of routes) {
		const match = route.pattern.exec(pathname);
		if (!match) continue;
		const params = {};
		route.params.forEach((name, index) => {
			params[name] = decodeURIComponent(match[index + 1] ?? "");
		});
		return {
			route,
			params
		};
	}
}
//#endregion
//#region ../../packages/otok/dist/server/index.js
async function resolveHead(route, data, params) {
	if (!route.module.head) return { title: "Otok App" };
	return await route.module.head({
		data,
		params,
		route: route.path
	});
}
function createOtokHandler(options) {
	return async (c) => {
		const url = new URL(c.req.url);
		const match = matchRoute(options.routes, url.pathname);
		if (!match) {
			if (!options.notFound) return c.notFound();
			return renderRoute(c, options.notFound, {}, options, 404);
		}
		return renderRoute(c, match.route, match.params, options);
	};
}
async function renderRoute(c, route, params, options, status = 200) {
	const context = {
		hono: c,
		request: c.req.raw,
		params,
		route: route.path
	};
	const data = route.module.loader ? await route.module.loader(context) : {};
	const head = await resolveHead(route, data, params);
	const Page = route.module.default;
	const islandContext = { islands: /* @__PURE__ */ new Set() };
	const html = pageHtml({
		body: withIslandRenderContext(islandContext, () => I(h(Page, {
			data,
			params,
			route: route.path
		}))),
		head,
		islands: [...islandContext.islands],
		manifest: options.manifest,
		clientEntry: options.clientEntry,
		devClientEntry: options.devClientEntry,
		base: options.base
	});
	return new Response(html, {
		status,
		headers: { "content-type": "text/html; charset=utf-8" }
	});
}
//#endregion
//#region src/app/routes/about.tsx
var about_exports = /* @__PURE__ */ __exportAll({
	default: () => About,
	head: () => head$3
});
var head$3 = () => ({
	title: "About Otok",
	description: "A static Otok route that ships no client JavaScript."
});
function About() {
	return /* @__PURE__ */ jsxs("main", {
		class: "mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-16",
		children: [
			/* @__PURE__ */ jsx("a", {
				class: "text-sm text-muted-foreground underline",
				href: "/",
				children: "Back home"
			}),
			/* @__PURE__ */ jsxs("section", {
				class: "space-y-4",
				children: [
					/* @__PURE__ */ jsx(Badge, {
						variant: "secondary",
						children: "Zero JS"
					}),
					/* @__PURE__ */ jsx("h1", {
						class: "text-4xl font-semibold tracking-tight",
						children: "This route has no islands."
					}),
					/* @__PURE__ */ jsx("p", {
						class: "text-muted-foreground",
						children: "Otok renders this page on the server and omits the client entry script because there is nothing to hydrate."
					})
				]
			}),
			/* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "What still works?" }) }), /* @__PURE__ */ jsxs(CardContent, {
				class: "space-y-2 text-sm text-muted-foreground",
				children: [/* @__PURE__ */ jsx("p", { children: "Semantic HTML, Tailwind classes, and presentational kamod-ui components." }), /* @__PURE__ */ jsx("p", { children: "Client state, event handlers, and portals belong in islands." })]
			})] })
		]
	});
}
//#endregion
//#region ../../packages/otok/dist/shared/islands.js
function encodeIslandProps(props) {
	if (!props || Object.keys(props).length === 0) return "";
	const json = JSON.stringify(props);
	if (typeof Buffer !== "undefined") return Buffer.from(json, "utf8").toString("base64url");
	const bytes = new TextEncoder().encode(json);
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
function resolveIslandId(component, explicitId) {
	if (explicitId) return explicitId;
	const named = component;
	return named.__otokIslandId ?? named.displayName ?? named.name ?? "";
}
//#endregion
//#region ../../packages/otok/dist/client/index.js
function Island({ component: Component, props, id }) {
	if (typeof window !== "undefined") return jsx(Fragment, {});
	const islandId = resolveIslandId(Component, id);
	if (!islandId) throw new Error("otok: Island components need a name, displayName, or explicit id.");
	registerRenderedIsland(islandId);
	return jsx("div", {
		"data-otok-island": islandId,
		"data-otok-props": encodeIslandProps(props),
		"data-otok-island-root": "",
		children: jsx(Component, { ...props })
	});
}
//#endregion
//#region src/app/islands/demo-dialog.tsx
function DemoDialog({ label }) {
	return /* @__PURE__ */ jsxs(Dialog, { children: [/* @__PURE__ */ jsx(DialogTrigger, {
		asChild: true,
		children: /* @__PURE__ */ jsx(Button, { children: label })
	}), /* @__PURE__ */ jsxs(DialogContent, { children: [/* @__PURE__ */ jsxs(DialogHeader, { children: [/* @__PURE__ */ jsx(DialogTitle, { children: "Hydrated island" }), /* @__PURE__ */ jsx(DialogDescription, { children: "This dialog is rendered on the server and becomes interactive when its island hydrates." })] }), /* @__PURE__ */ jsx(DialogFooter, { children: /* @__PURE__ */ jsx(DialogClose, {
		asChild: true,
		children: /* @__PURE__ */ jsx(Button, {
			variant: "secondary",
			children: "Close"
		})
	}) })] })] });
}
//#endregion
//#region src/app/islands/theme-island.tsx
function ThemeIsland() {
	return /* @__PURE__ */ jsxs("div", {
		class: "flex items-center gap-3",
		children: [/* @__PURE__ */ jsx(ThemeToggle, {}), /* @__PURE__ */ jsx("span", {
			class: "text-sm text-muted-foreground",
			children: "Toggle dark mode"
		})]
	});
}
//#endregion
//#region src/app/routes/demo.tsx
var demo_exports = /* @__PURE__ */ __exportAll({
	default: () => Demo,
	head: () => head$2
});
var head$2 = () => ({
	title: "Otok kamod-ui demo",
	description: "Interactive kamod-ui components hydrated as islands."
});
function Demo() {
	return /* @__PURE__ */ jsxs("main", {
		class: "mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-16",
		children: [
			/* @__PURE__ */ jsx("a", {
				class: "text-sm text-muted-foreground underline",
				href: "/",
				children: "Back home"
			}),
			/* @__PURE__ */ jsxs("section", {
				class: "space-y-3",
				children: [/* @__PURE__ */ jsx("h1", {
					class: "text-4xl font-semibold tracking-tight",
					children: "kamod-ui islands"
				}), /* @__PURE__ */ jsx("p", {
					class: "text-muted-foreground",
					children: "Dialog and theme interactions are isolated islands. The surrounding page remains static."
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				class: "grid gap-4 sm:grid-cols-2",
				children: [/* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsxs(CardHeader, { children: [/* @__PURE__ */ jsx(CardTitle, { children: "Dialog" }), /* @__PURE__ */ jsx(CardDescription, { children: "Hydrated only inside this card." })] }), /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx(Island, {
					component: DemoDialog,
					props: { label: "Open dialog" }
				}) })] }), /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsxs(CardHeader, { children: [/* @__PURE__ */ jsx(CardTitle, { children: "Theme" }), /* @__PURE__ */ jsx(CardDescription, { children: "Theme state stays client-side." })] }), /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx(Island, {
					component: ThemeIsland,
					props: {}
				}) })] })]
			})
		]
	});
}
//#endregion
//#region src/app/routes/users/[id].tsx
var _id__exports = /* @__PURE__ */ __exportAll({
	default: () => UserPage,
	head: () => head$1,
	loader: () => loader$1
});
var loader$1 = async ({ params }) => ({ userId: params.id });
var head$1 = ({ data }) => ({ title: `User ${data.userId}` });
function UserPage({ data }) {
	return /* @__PURE__ */ jsxs("main", {
		class: "mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16",
		children: [/* @__PURE__ */ jsx("a", {
			class: "text-sm text-muted-foreground underline",
			href: "/",
			children: "Back home"
		}), /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Dynamic route" }) }), /* @__PURE__ */ jsxs(CardContent, {
			class: "space-y-3",
			children: [/* @__PURE__ */ jsx(Badge, { children: "/users/[id]" }), /* @__PURE__ */ jsxs("p", {
				class: "text-muted-foreground",
				children: ["Loaded user id: ", data.userId]
			})]
		})] })]
	});
}
//#endregion
//#region src/app/islands/counter.tsx
function Counter({ init = 0 }) {
	const [count, setCount] = useState(init);
	return /* @__PURE__ */ jsxs("div", {
		class: "flex items-center gap-4",
		children: [/* @__PURE__ */ jsxs("p", {
			class: "text-sm text-muted-foreground",
			children: ["Count: ", count]
		}), /* @__PURE__ */ jsx(Button, {
			onClick: () => setCount((current) => current + 1),
			children: "Increment"
		})]
	});
}
//#endregion
//#region src/app/routes/index.tsx
var routes_exports = /* @__PURE__ */ __exportAll({
	default: () => Home,
	head: () => head,
	loader: () => loader
});
var loader = async () => ({ initialCount: 5 });
var head = () => ({
	title: "Otok",
	description: "Hono + Preact Islands + kamod-ui."
});
function Home({ data }) {
	return /* @__PURE__ */ jsxs("main", {
		class: "mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-16",
		children: [/* @__PURE__ */ jsxs("section", {
			class: "space-y-5",
			children: [
				/* @__PURE__ */ jsx(Badge, { children: "Otok" }),
				/* @__PURE__ */ jsxs("div", {
					class: "space-y-3",
					children: [/* @__PURE__ */ jsx("h1", {
						class: "text-4xl font-semibold tracking-tight sm:text-6xl",
						children: "Hono SSR with Preact islands."
					}), /* @__PURE__ */ jsx("p", {
						class: "max-w-2xl text-lg text-muted-foreground",
						children: "Routes render to static HTML. Only islands ship JavaScript and hydrate on the client."
					})]
				}),
				/* @__PURE__ */ jsxs("nav", {
					class: "flex flex-wrap gap-3",
					children: [/* @__PURE__ */ jsx(Button, {
						href: "/about",
						children: "Zero-JS route"
					}), /* @__PURE__ */ jsx(Button, {
						href: "/demo",
						variant: "secondary",
						children: "kamod-ui islands"
					})]
				})
			]
		}), /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Counter island" }) }), /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx(Island, {
			component: Counter,
			props: { init: data.initialCount }
		}) })] })]
	});
}
//#endregion
//#region \0virtual:otok-routes
var routes = [
	{
		id: "about",
		path: "/about",
		pattern: /* @__PURE__ */ new RegExp("^/about/?$"),
		params: [],
		module: about_exports
	},
	{
		id: "demo",
		path: "/demo",
		pattern: /* @__PURE__ */ new RegExp("^/demo/?$"),
		params: [],
		module: demo_exports
	},
	{
		id: "users.[id]",
		path: "/users/:id",
		pattern: /* @__PURE__ */ new RegExp("^/users/([^/]+)/?$"),
		params: ["id"],
		module: _id__exports
	},
	{
		id: "index",
		path: "/",
		pattern: /* @__PURE__ */ new RegExp("^//?$"),
		params: [],
		module: routes_exports
	}
];
//#endregion
//#region src/server.ts
function readManifest() {
	const manifestUrl = new URL("../client/.vite/manifest.json", import.meta.url);
	return JSON.parse(readFileSync(manifestUrl, "utf8"));
}
var app = new Hono();
app.get("/api/health", (c) => c.json({
	ok: true,
	framework: "otok"
}));
app.use("/assets/*", serveStatic({ root: "./dist/client" }));
app.get("*", createOtokHandler({
	routes,
	manifest: readManifest(),
	clientEntry: "src/client.ts",
	devClientEntry: "/src/client.ts"
}));
serve({
	fetch: app.fetch,
	port: Number(process.env.PORT ?? 3e3)
});
//#endregion
export { app as default };
