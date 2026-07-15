import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { Fragment, h, options } from "preact";
import { readFileSync } from "node:fs";
import { Avatar, AvatarFallback, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, DataTable, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input, Label, RadioGroup, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectableCard, Separator, TableBody, TableCell, TableHead, TableHeader, TableRow, ThemeToggle } from "@kamod-ui/core";
import { Fragment as Fragment$1, jsx, jsxs } from "preact/jsx-runtime";
import { useEffect, useState } from "preact/hooks";
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
//#region ../../packages/otok/dist/shared/navigation.js
/** Marks the server-rendered page region replaced during soft navigation. */
var OTOK_PAGE_ATTR = "data-otok-page";
/** Marks head elements synced during soft navigation. */
var OTOK_HEAD_ATTR = "data-otok-head";
//#endregion
//#region ../../packages/otok/dist/shared/theme.js
function resolveDarkModeFromCookie(cookieHeader) {
	if (!cookieHeader) return false;
	if (cookieHeader.match(/(?:^|;\s*)theme=(dark|light)(?:;|$)/i)?.[1]?.toLowerCase() === "dark") return true;
	return false;
}
var themeBootstrapScript = `<script>(function(){try{var d=document.documentElement,t=localStorage.getItem("theme");if(t!=="dark"&&t!=="light"){var m=document.cookie.match(/(?:^|;\\s*)theme=(dark|light)(?:;|$)/i);t=m?m[1]:null}if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches))d.classList.add("dark");else d.classList.remove("dark")}catch(e){}})();<\/script>`;
var themeColorSchemeStyle = `<style>html{color-scheme:light}html.dark{color-scheme:dark}</style>`;
//#endregion
//#region ../../packages/otok/dist/server/html.js
function escapeHtml(value) {
	return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;");
}
function escapeScriptJson(value) {
	return value.replaceAll("<", "\\u003c");
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
	const description = head?.description ? `<meta ${OTOK_HEAD_ATTR}="description" name="description" content="${escapeHtml(head.description)}">` : "";
	const meta = Object.entries(head?.meta ?? {}).map(([name, content]) => `<meta ${OTOK_HEAD_ATTR}="${escapeHtml(name)}" name="${escapeHtml(name)}" content="${escapeHtml(content)}">`).join("\n    ");
	const links = (head?.links ?? []).map((link) => {
		return `<link ${[
			`${OTOK_HEAD_ATTR}="${escapeHtml(link.rel === "canonical" ? "canonical" : `link:${link.rel}:${link.href}`)}"`,
			`rel="${escapeHtml(link.rel)}"`,
			`href="${escapeHtml(link.href)}"`,
			link.crossorigin ? `crossorigin="${escapeHtml(link.crossorigin)}"` : "",
			link.as ? `as="${escapeHtml(link.as)}"` : "",
			link.type ? `type="${escapeHtml(link.type)}"` : ""
		].filter(Boolean).join(" ")}>`;
	}).join("\n    ");
	const scripts = (head?.scripts ?? []).map((script, index) => {
		return `<script ${[
			`${OTOK_HEAD_ATTR}="script:${index}"`,
			script.src ? `src="${escapeHtml(script.src)}"` : "",
			script.type ? `type="${escapeHtml(script.type)}"` : "",
			script.async ? "async" : "",
			script.defer ? "defer" : ""
		].filter(Boolean).join(" ")}><\/script>`;
	}).join("\n    ");
	const jsonLd = head?.jsonLd ? `<script ${OTOK_HEAD_ATTR}="json-ld" type="application/ld+json">${escapeScriptJson(JSON.stringify(head.jsonLd))}<\/script>` : "";
	return [
		"<meta charset=\"utf-8\">",
		"<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
		`<title ${OTOK_HEAD_ATTR}="title">${title}</title>`,
		description,
		meta,
		links,
		scripts,
		jsonLd
	].filter(Boolean).join("\n    ");
}
function pageHtml({ body, head, islands, manifest, clientEntry = "src/client.ts", devClientEntry = "/src/client.ts", devStylesheets = [], base = "/", client = false, darkMode = false, theme = false }) {
	const entry = findEntry(manifest, clientEntry);
	const stylesheetLinks = (manifest ? collectCss(manifest, entry) : devStylesheets).map((href) => `<link rel="stylesheet" href="${escapeHtml(publicPath(href, base))}">`).join("\n    ");
	const clientScript = client || islands.length > 0 || !manifest ? entry?.file ? `<script type="module" src="${escapeHtml(publicPath(entry.file, base))}"><\/script>` : `<script type="module" src="${escapeHtml(devClientEntry)}"><\/script>` : "";
	return `<!doctype html>
<html lang="${escapeHtml(head?.lang ?? "en")}"${darkMode ? ` class="dark"` : ""}>
  <head>
    ${theme ? `${themeBootstrapScript}\n    ${themeColorSchemeStyle}` : ""}
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
//#region ../../packages/otok/dist/shared/island-context.js
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
	if (!activeContext) return `otok-${id}`;
	activeContext.islands.add(id);
	const instanceId = `otok-${activeContext.nextIslandId}`;
	activeContext.nextIslandId += 1;
	return instanceId;
}
//#endregion
//#region ../../packages/otok/dist/shared/routes.js
var OtokHttpError = class extends Error {
	status;
	headers;
	failure;
	constructor(status, message = "Otok request failed", headers, failure) {
		super(message);
		this.status = status;
		this.name = "OtokHttpError";
		this.headers = new Headers(headers);
		this.failure = failure;
	}
};
function json(data, init) {
	const responseInit = typeof init === "number" ? { status: init } : init;
	const headers = new Headers(responseInit?.headers);
	if (!headers.has("content-type")) headers.set("content-type", "application/json; charset=utf-8");
	return new Response(JSON.stringify(data), {
		...responseInit,
		headers
	});
}
function redirect(location, status = 302) {
	if (!location) throw new TypeError("otok: redirect() requires a Location value.");
	if (status < 300 || status > 399) throw new RangeError("otok: redirect() status must be a 3xx status code.");
	throw new OtokHttpError(status, "Redirect", { location });
}
function fail(first = "Internal server error", second = 500) {
	if (typeof first === "number") {
		const failure = normalizeFailure(first, second && typeof second === "object" ? second : {});
		throw new OtokHttpError(failure.status, failure.message ?? "Request failed", void 0, failure);
	}
	const status = typeof second === "number" ? second : 500;
	throw new OtokHttpError(status, first, void 0, {
		status,
		message: first
	});
}
function normalizeFailure(status, failure) {
	return {
		status,
		...failure,
		fieldErrors: normalizeFieldErrors(failure.fieldErrors)
	};
}
function normalizeFieldErrors(fieldErrors) {
	if (!fieldErrors) return void 0;
	return Object.fromEntries(Object.entries(fieldErrors).map(([field, errors]) => [field, [...errors]]));
}
function isOtokHttpError(error) {
	return error instanceof OtokHttpError;
}
//#endregion
//#region ../../packages/otok/dist/server/manifest.js
/**
* Read the Vite client manifest produced by `vite build --mode client`.
*
* @example
* ```ts
* const manifest = readOtokManifest(import.meta.url);
* ```
*/
function readOtokManifest(moduleUrl, options = {}) {
	const prodOnly = options.prodOnly ?? true;
	const isProd = options.isProd ?? (typeof import.meta !== "undefined" && true);
	if (prodOnly && !isProd) return void 0;
	const manifestUrl = new URL(options.manifestPath ?? "../client/.vite/manifest.json", moduleUrl);
	return JSON.parse(readFileSync(manifestUrl, "utf8"));
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
async function resolveChrome(route, data, params) {
	if (!route.module.chrome) return void 0;
	return await route.module.chrome({
		data,
		params,
		route: route.path
	});
}
function createOtokHandler(options) {
	return async (c) => {
		const url = new URL(c.req.url);
		const match = matchRoute(options.routes, url.pathname);
		try {
			if (!match) {
				const notFoundRoute = options.notFoundRoute ?? options.notFound;
				if (!notFoundRoute) return c.notFound();
				return await renderRoute(c, notFoundRoute, {}, options, 404);
			}
			if (isActionRequest(c.req.method)) return await handleAction(c, match.route, match.params, options);
			return await renderRoute(c, match.route, match.params, options);
		} catch (error) {
			return handleRenderError(c, error, options);
		}
	};
}
function isActionRequest(method) {
	const normalized = method.toUpperCase();
	return normalized === "POST" || normalized === "PUT" || normalized === "PATCH" || normalized === "DELETE";
}
function resolveActionMethod(method, formData) {
	const override = formData?.get("_method");
	const candidate = typeof override === "string" ? override.toUpperCase() : method.toUpperCase();
	if (candidate === "PUT" || candidate === "PATCH" || candidate === "DELETE") return candidate;
	return "POST";
}
function isFormRequest(request) {
	const contentType = request.headers.get("content-type") ?? "";
	return contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");
}
async function resolveActionFormData(request) {
	if (!isFormRequest(request)) return void 0;
	return await request.clone().formData();
}
async function handleAction(c, route, params, options) {
	if (!route.module.action) return new Response("Method Not Allowed", {
		status: 405,
		headers: { allow: "GET, HEAD" }
	});
	const formData = await resolveActionFormData(c.req.raw);
	const context = {
		hono: c,
		request: c.req.raw,
		params,
		route: route.path,
		method: resolveActionMethod(c.req.method, formData),
		formData
	};
	try {
		const result = await route.module.action(context);
		if (result instanceof Response) return result;
		return await renderRoute(c, route, params, options, statusForActionResult(result), void 0, result);
	} catch (error) {
		if (isOtokHttpError(error) && error.headers.has("location")) return new Response(null, {
			status: error.status,
			headers: error.headers
		});
		if (isOtokHttpError(error) && error.failure && error.status !== 404) return await renderRoute(c, route, params, options, error.status, void 0, error.failure);
		throw error;
	}
}
function statusForActionResult(result) {
	return typeof result === "object" && result !== null && "status" in result && typeof result.status === "number" ? result.status : 200;
}
async function renderRoute(c, route, params, options, status = 200, dataOverride, actionData) {
	const context = {
		hono: c,
		request: c.req.raw,
		params,
		route: route.path
	};
	const data = dataOverride ?? (route.module.loader ? await route.module.loader(context) : {});
	if (data instanceof Response) return data;
	const head = await resolveHead(route, data, params);
	const chrome = await resolveChrome(route, data, params);
	const Page = route.module.default;
	const props = {
		data,
		actionData,
		params,
		route: route.path,
		chrome
	};
	const islandContext = {
		islands: /* @__PURE__ */ new Set(),
		nextIslandId: 0
	};
	const body = withIslandRenderContext(islandContext, () => {
		let tree = h("div", { [OTOK_PAGE_ATTR]: "" }, h(Page, props));
		for (const layout of [...route.layouts ?? []].reverse()) tree = h(layout.default, {
			...props,
			children: tree
		});
		return I(tree);
	});
	const themeEnabled = options.theme ?? false;
	const html = pageHtml({
		body,
		head,
		islands: [...islandContext.islands],
		manifest: options.manifest,
		clientEntry: options.clientEntry,
		devClientEntry: options.devClientEntry,
		devStylesheets: options.devStylesheets,
		base: options.base,
		client: route.module.client === true,
		theme: themeEnabled,
		darkMode: themeEnabled ? resolveDarkModeFromCookie(c.req.header("cookie")) : false
	});
	return new Response(html, {
		status,
		headers: { "content-type": "text/html; charset=utf-8" }
	});
}
async function handleRenderError(c, error, options) {
	if (isOtokHttpError(error)) {
		if (error.headers.get("location")) return new Response(null, {
			status: error.status,
			headers: error.headers
		});
		if (error.status === 404) {
			const notFoundRoute = options.notFoundRoute ?? options.notFound;
			if (notFoundRoute) return renderFallbackRoute(c, notFoundRoute, options, 404, { message: error.message });
		}
		if (options.errorRoute) return renderFallbackRoute(c, options.errorRoute, options, error.status, error.failure ?? {
			message: error.message,
			status: error.status
		});
		if (error.failure) return json(error.failure, {
			status: error.status,
			headers: error.headers
		});
		return new Response(error.message, {
			status: error.status,
			headers: error.headers
		});
	}
	if (options.errorRoute) {
		const message = options.exposeErrorDetails === true && error instanceof Error ? error.message : "Internal server error";
		return renderFallbackRoute(c, options.errorRoute, options, 500, {
			message,
			status: 500
		});
	}
	throw error;
}
async function renderFallbackRoute(c, route, options, status, data) {
	try {
		return await renderRoute(c, route, {}, options, status, data);
	} catch {
		return new Response(status === 404 ? "Not found" : "Internal server error", { status });
	}
}
function createOtokApp(options) {
	const app = new Hono();
	options.configure?.(app);
	if (options.health) {
		const payload = typeof options.health === "object" ? options.health : {
			ok: true,
			framework: "otok"
		};
		app.get("/api/health", (c) => c.json(payload));
	}
	if (options.staticDir) app.use(`${options.assetsPath ?? "/assets"}/*`, serveStatic({ root: options.staticDir }));
	app.all("*", createOtokHandler(options));
	return app;
}
//#endregion
//#region src/app/routes/about.tsx
var about_exports = /* @__PURE__ */ __exportAll({
	chrome: () => chrome$5,
	default: () => About,
	head: () => head$7
});
var head$7 = () => ({
	title: "About | Otok Playground",
	description: "A static Otok route that ships no client JavaScript."
});
var chrome$5 = () => ({
	title: "Zero-JS route",
	description: "This route has no islands."
});
function About() {
	return /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsxs("section", {
		class: "space-y-4",
		children: [/* @__PURE__ */ jsx(Badge, {
			variant: "secondary",
			children: "Zero JS"
		}), /* @__PURE__ */ jsx("p", {
			class: "max-w-2xl text-muted-foreground",
			children: "Otok renders this page on the server and omits the client entry script because there is nothing to hydrate."
		})]
	}), /* @__PURE__ */ jsxs(Card, {
		class: "mt-6",
		children: [/* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "What still works?" }) }), /* @__PURE__ */ jsxs(CardContent, {
			class: "space-y-2 text-sm text-muted-foreground",
			children: [/* @__PURE__ */ jsx("p", { children: "Semantic HTML, Tailwind classes, and presentational kamod-ui components." }), /* @__PURE__ */ jsx("p", { children: "Client state, event handlers, and portals belong in islands." })]
		})]
	})] });
}
//#endregion
//#region src/app/routes/boom.tsx
var boom_exports = /* @__PURE__ */ __exportAll({
	default: () => Boom,
	loader: () => loader$4
});
var loader$4 = () => {
	fail("Boom from loader");
};
function Boom() {
	return /* @__PURE__ */ jsx("p", { children: "This page should never render." });
}
//#endregion
//#region ../../packages/otok/dist/shared/islands.js
var DEFAULT_LARGE_PROPS_THRESHOLD = 2048;
function encodeIslandProps(props) {
	if (!props || Object.keys(props).length === 0) return "";
	const json = JSON.stringify(props);
	if (typeof Buffer !== "undefined") return Buffer.from(json, "utf8").toString("base64url");
	const bytes = new TextEncoder().encode(json);
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
function encodeIslandPropsForHtml(props, propsId, threshold = DEFAULT_LARGE_PROPS_THRESHOLD) {
	if (!props || Object.keys(props).length === 0) return { attribute: "" };
	const json = JSON.stringify(props);
	if (json.length <= threshold) return { attribute: encodeIslandProps(props) };
	return {
		attribute: "",
		propsId,
		scriptJson: json.replaceAll("<", "\\u003c")
	};
}
function resolveIslandId(component, explicitId) {
	if (explicitId) return explicitId;
	return component.__otokIslandId ?? "";
}
//#endregion
//#region ../../packages/otok/dist/client/index.js
function Island({ component: Component, props, id, strategy = "load", media, rootMargin }) {
	if (typeof window !== "undefined") return jsx(Fragment, {});
	const islandId = resolveIslandId(Component, id);
	if (!islandId) throw new Error("otok: Island components need a name, displayName, or explicit id.");
	const encodedProps = encodeIslandPropsForHtml(props, registerRenderedIsland(islandId));
	const hydrationStrategy = strategy === "client-only" ? "load" : strategy;
	return jsxs(Fragment, { children: [jsx("div", {
		"data-otok-island": islandId,
		"data-otok-props": encodedProps.attribute,
		"data-otok-props-id": encodedProps.propsId,
		"data-otok-strategy": hydrationStrategy,
		"data-otok-media": media,
		"data-otok-root-margin": rootMargin,
		"data-otok-island-root": "",
		children: strategy === "client-only" ? null : jsx(Component, { ...props })
	}), encodedProps.scriptJson ? jsx("script", {
		type: "application/json",
		"data-otok-props-for": encodedProps.propsId,
		dangerouslySetInnerHTML: { __html: encodedProps.scriptJson }
	}) : null] });
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
DemoDialog.__otokIslandId = "DemoDialog";
//#endregion
//#region src/app/islands/dashboard-toolbar.tsx
var commands = [
	{
		label: "Classic Dashboard",
		href: "/"
	},
	{
		label: "Zero-JS route",
		href: "/about"
	},
	{
		label: "kamod-ui islands",
		href: "/demo"
	},
	{
		label: "Dynamic route",
		href: "/users/alice"
	}
];
function DashboardToolbar() {
	const [open, setOpen] = useState(false);
	useEffect(() => {
		const onKeyDown = (event) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				setOpen((current) => !current);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);
	return /* @__PURE__ */ jsxs(Fragment$1, { children: [
		/* @__PURE__ */ jsxs(Button, {
			variant: "outline",
			size: "sm",
			class: "hidden h-8 w-64 justify-start text-muted-foreground sm:flex",
			onClick: () => setOpen(true),
			children: ["Search for a command to run...", /* @__PURE__ */ jsx("kbd", {
				class: "pointer-events-none ms-auto hidden rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:inline",
				children: "⌘K"
			})]
		}),
		/* @__PURE__ */ jsx(Button, {
			variant: "outline",
			size: "sm",
			class: "sm:hidden",
			onClick: () => setOpen(true),
			children: "Search"
		}),
		/* @__PURE__ */ jsx(ThemeToggle, {}),
		/* @__PURE__ */ jsx(CommandDialog, {
			open,
			onOpenChange: setOpen,
			children: /* @__PURE__ */ jsxs(Command, { children: [/* @__PURE__ */ jsx(CommandInput, { placeholder: "Search for a command to run..." }), /* @__PURE__ */ jsxs(CommandList, { children: [/* @__PURE__ */ jsx(CommandEmpty, { children: "No results found." }), /* @__PURE__ */ jsx(CommandGroup, {
				heading: "Pages",
				children: commands.map((command) => /* @__PURE__ */ jsx(CommandItem, {
					value: command.label,
					onSelect: () => {
						setOpen(false);
						window.location.href = command.href;
					},
					children: command.label
				}, command.href))
			})] })] })
		})
	] });
}
DashboardToolbar.__otokIslandId = "DashboardToolbar";
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
ThemeIsland.__otokIslandId = "ThemeIsland";
//#endregion
//#region src/app/routes/demo.tsx
var demo_exports = /* @__PURE__ */ __exportAll({
	chrome: () => chrome$4,
	default: () => Demo,
	head: () => head$6
});
var head$6 = () => ({
	title: "kamod-ui islands | Otok Playground",
	description: "Interactive kamod-ui components hydrated as islands."
});
var chrome$4 = () => ({
	title: "kamod-ui islands",
	description: "Dialog and theme interactions are isolated islands.",
	toolbar: /* @__PURE__ */ jsx(Island, {
		component: DashboardToolbar,
		props: {},
		strategy: "load"
	})
});
function Demo() {
	return /* @__PURE__ */ jsxs("div", {
		class: "grid gap-4 sm:grid-cols-2",
		children: [/* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsxs(CardHeader, { children: [/* @__PURE__ */ jsx(CardTitle, { children: "Dialog" }), /* @__PURE__ */ jsx(CardDescription, { children: "Hydrated only inside this card." })] }), /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx(Island, {
			component: DemoDialog,
			props: { label: "Open dialog" },
			strategy: "idle"
		}) })] }), /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsxs(CardHeader, { children: [/* @__PURE__ */ jsx(CardTitle, { children: "Theme" }), /* @__PURE__ */ jsx(CardDescription, { children: "Theme state stays client-side." })] }), /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx(Island, {
			component: ThemeIsland,
			props: {},
			strategy: "idle"
		}) })] })]
	});
}
//#endregion
//#region src/app/routes/projects.tsx
var projects_exports = /* @__PURE__ */ __exportAll({
	action: () => action,
	chrome: () => chrome$3,
	client: () => true,
	default: () => ProjectsPage,
	head: () => head$5,
	loader: () => loader$3
});
var projects = [{
	id: "otok",
	name: "Otok",
	featured: true
}];
var chrome$3 = () => ({
	title: "Projects",
	description: "Progressive route actions and HTML forms."
});
var head$5 = () => ({
	title: "Projects | Otok Playground",
	description: "Progressive forms powered by Otok route actions."
});
var loader$3 = () => ({ projects });
async function action({ formData, method }) {
	const name = String(formData?.get("name") ?? "").trim();
	const intent = String(formData?.get("intent") ?? "create");
	if (method === "DELETE" || intent === "delete") {
		const id = String(formData?.get("id") ?? "");
		const index = projects.findIndex((project) => project.id === id);
		if (index >= 0) projects.splice(index, 1);
		redirect("/projects?deleted=1", 303);
	}
	if (!name) fail(400, {
		message: "Validation failed",
		fieldErrors: { name: ["Name is required"] },
		formErrors: ["Please enter a project name."]
	});
	const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "project";
	projects.unshift({
		id: `${id}-${projects.length + 1}`,
		name,
		featured: formData?.get("featured") === "on"
	});
	redirect("/projects?created=1", 303);
}
function ProjectsPage({ data, actionData }) {
	const result = actionData;
	return /* @__PURE__ */ jsxs("section", {
		class: "space-y-8",
		children: [
			/* @__PURE__ */ jsxs("div", { children: [
				/* @__PURE__ */ jsx("p", {
					class: "text-sm font-medium text-sky-600 dark:text-sky-300",
					children: "Route actions"
				}),
				/* @__PURE__ */ jsx("h2", {
					class: "mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white",
					children: "Projects"
				}),
				/* @__PURE__ */ jsx("p", {
					class: "mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300",
					children: "This form works without JavaScript and is progressively enhanced by soft navigation when the client is loaded."
				})
			] }),
			result?.formErrors?.map((error) => /* @__PURE__ */ jsx("p", {
				class: "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700",
				role: "alert",
				tabIndex: -1,
				children: error
			})),
			/* @__PURE__ */ jsxs("form", {
				method: "post",
				class: "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950",
				children: [
					/* @__PURE__ */ jsx("label", {
						class: "block text-sm font-medium text-slate-700 dark:text-slate-200",
						for: "project-name",
						children: "Project name"
					}),
					/* @__PURE__ */ jsx("input", {
						id: "project-name",
						name: "name",
						"aria-invalid": Boolean(result?.fieldErrors?.name),
						"aria-describedby": result?.fieldErrors?.name ? "project-name-error" : void 0,
						class: "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
					}),
					result?.fieldErrors?.name?.map((error) => /* @__PURE__ */ jsx("p", {
						id: "project-name-error",
						class: "mt-2 text-sm text-red-600",
						role: "alert",
						tabIndex: -1,
						children: error
					})),
					/* @__PURE__ */ jsxs("label", {
						class: "mt-4 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200",
						children: [/* @__PURE__ */ jsx("input", {
							name: "featured",
							type: "checkbox"
						}), " Featured"]
					}),
					/* @__PURE__ */ jsx("button", {
						class: "mt-4 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-slate-950",
						name: "intent",
						value: "create",
						children: "Save project"
					})
				]
			}),
			/* @__PURE__ */ jsx("ul", {
				class: "grid gap-3",
				"aria-label": "Projects",
				children: data.projects.map((project) => /* @__PURE__ */ jsxs("li", {
					class: "flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950",
					children: [/* @__PURE__ */ jsxs("span", { children: [
						project.name,
						" ",
						project.featured ? /* @__PURE__ */ jsx("span", {
							class: "text-xs text-sky-600",
							children: "Featured"
						}) : null
					] }), /* @__PURE__ */ jsxs("form", {
						method: "post",
						children: [
							/* @__PURE__ */ jsx("input", {
								type: "hidden",
								name: "_method",
								value: "delete"
							}),
							/* @__PURE__ */ jsx("input", {
								type: "hidden",
								name: "id",
								value: project.id
							}),
							/* @__PURE__ */ jsx("button", {
								class: "text-sm text-red-600",
								name: "intent",
								value: "delete",
								children: "Delete"
							})
						]
					})]
				}, project.id))
			}),
			/* @__PURE__ */ jsxs("form", {
				method: "post",
				"data-otok-no-nav": "",
				class: "text-sm text-slate-500",
				children: [/* @__PURE__ */ jsx("input", {
					type: "hidden",
					name: "name",
					value: "Opt out project"
				}), /* @__PURE__ */ jsx("button", {
					name: "intent",
					value: "create",
					children: "Native opt-out submit"
				})]
			})
		]
	});
}
//#endregion
//#region src/app/routes/users/[id].tsx
var _id__exports = /* @__PURE__ */ __exportAll({
	chrome: () => chrome$2,
	default: () => UserPage,
	head: () => head$4,
	loader: () => loader$2
});
var loader$2 = async ({ params }) => ({ userId: params.id });
var head$4 = ({ data }) => ({ title: `User ${data.userId} | Otok Playground` });
var chrome$2 = ({ params }) => ({
	title: "Dynamic route",
	description: `Server-rendered route for ${params.id}.`
});
function UserPage({ data }) {
	return /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "/users/[id]" }) }), /* @__PURE__ */ jsxs(CardContent, {
		class: "space-y-3",
		children: [/* @__PURE__ */ jsx(Badge, { children: "/users/[id]" }), /* @__PURE__ */ jsxs("p", {
			class: "text-muted-foreground",
			children: ["Loaded user id: ", data.userId]
		})]
	})] });
}
//#endregion
//#region src/app/components/exercise-chart.tsx
function ExerciseChart({ data }) {
	const max = Math.max(...data.map((d) => d.minutes), 1);
	const width = 480;
	const height = 200;
	const padding = {
		top: 12,
		right: 12,
		bottom: 28,
		left: 12
	};
	const chartWidth = width - padding.left - padding.right;
	const chartHeight = height - padding.top - padding.bottom;
	const barWidth = chartWidth / data.length - 8;
	return /* @__PURE__ */ jsxs(Card, {
		class: "col-span-4",
		children: [/* @__PURE__ */ jsxs(CardHeader, { children: [/* @__PURE__ */ jsx(CardTitle, { children: "Exercise Minutes" }), /* @__PURE__ */ jsx(CardDescription, { children: "Your exercise minutes are ahead of where you normally are." })] }), /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("svg", {
			viewBox: `0 0 ${width} ${height}`,
			class: "h-[200px] w-full text-primary",
			role: "img",
			"aria-label": "Exercise minutes bar chart",
			children: data.map((point, index) => {
				const barHeight = point.minutes / max * chartHeight;
				const x = padding.left + index * (chartWidth / data.length) + 4;
				return /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx("rect", {
					x,
					y: padding.top + chartHeight - barHeight,
					width: barWidth,
					height: barHeight,
					rx: 4,
					class: "fill-primary/80"
				}), /* @__PURE__ */ jsx("text", {
					x: x + barWidth / 2,
					y: height - 8,
					"text-anchor": "middle",
					class: "fill-muted-foreground text-[10px]",
					children: point.day
				})] }, point.day);
			})
		}) })]
	});
}
//#endregion
//#region src/app/components/payments-table.tsx
function statusVariant(status) {
	if (status === "success") return "success";
	if (status === "failed") return "destructive";
	return "secondary";
}
function PaymentsTable({ payments }) {
	return /* @__PURE__ */ jsxs(Card, {
		class: "col-span-3",
		children: [/* @__PURE__ */ jsxs(CardHeader, { children: [/* @__PURE__ */ jsx(CardTitle, { children: "Latest Payments" }), /* @__PURE__ */ jsx(CardDescription, { children: "See recent payments from your customers here." })] }), /* @__PURE__ */ jsxs(CardContent, { children: [/* @__PURE__ */ jsxs(DataTable, { children: [/* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
			/* @__PURE__ */ jsx(TableHead, { children: "Customer" }),
			/* @__PURE__ */ jsx(TableHead, {
				class: "hidden sm:table-cell",
				children: "Email"
			}),
			/* @__PURE__ */ jsx(TableHead, { children: "Amount" }),
			/* @__PURE__ */ jsx(TableHead, { children: "Status" })
		] }) }), /* @__PURE__ */ jsx(TableBody, { children: payments.map((payment) => /* @__PURE__ */ jsxs(TableRow, { children: [
			/* @__PURE__ */ jsx(TableCell, {
				class: "font-medium",
				children: payment.customer
			}),
			/* @__PURE__ */ jsx(TableCell, {
				class: "hidden text-muted-foreground sm:table-cell",
				children: payment.email
			}),
			/* @__PURE__ */ jsx(TableCell, { children: payment.amount }),
			/* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, {
				variant: statusVariant(payment.status),
				children: payment.status
			}) })
		] }, payment.email)) })] }), /* @__PURE__ */ jsxs("p", {
			class: "mt-4 text-xs text-muted-foreground",
			children: [
				"0 of ",
				payments.length,
				" row(s) selected."
			]
		})] })]
	});
}
//#endregion
//#region src/app/components/stat-card.tsx
function StatCard({ title, value, change }) {
	return /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, {
		class: "flex flex-row items-center justify-between space-y-0 pb-2",
		children: /* @__PURE__ */ jsx(CardTitle, {
			class: "text-sm font-medium",
			children: title
		})
	}), /* @__PURE__ */ jsxs(CardContent, { children: [/* @__PURE__ */ jsx("div", {
		class: "text-2xl font-bold",
		children: value
	}), change ? /* @__PURE__ */ jsx("p", {
		class: "text-xs text-muted-foreground",
		children: change
	}) : null] })] });
}
//#endregion
//#region src/app/data/dashboard.ts
var dashboardUser = {
	name: "Toby Belhome",
	email: "hello@tobybelhome.com",
	initials: "TB"
};
var dashboardStats = {
	subscriptions: {
		value: 4850,
		change: "+180.1% from last month"
	},
	revenue: {
		value: 15231.89,
		change: "+20.1% from last month"
	}
};
var teamMembers = [
	{
		name: "Toby Belhome",
		email: "contact@bundui.io",
		role: "Owner",
		initials: "TB"
	},
	{
		name: "Jackson Lee",
		email: "pre@example.com",
		role: "Developer",
		initials: "JL"
	},
	{
		name: "Hally Gray",
		email: "hally@site.com",
		role: "Viewer",
		initials: "HG"
	}
];
var payments = [
	{
		customer: "Kenneth Thompson",
		email: "ken99@yahoo.com",
		amount: "$316.00",
		status: "success"
	},
	{
		customer: "Abraham Lincoln",
		email: "abe45@gmail.com",
		amount: "$242.00",
		status: "success"
	},
	{
		customer: "Monserrat Rodriguez",
		email: "monserrat44@gmail.com",
		amount: "$837.00",
		status: "processing"
	},
	{
		customer: "Silas Johnson",
		email: "silas22@gmail.com",
		amount: "$874.00",
		status: "success"
	},
	{
		customer: "Carmella DeVito",
		email: "carmella@hotmail.com",
		amount: "$721.00",
		status: "failed"
	},
	{
		customer: "Maria Garcia",
		email: "maria@gmail.com",
		amount: "$529.00",
		status: "success"
	},
	{
		customer: "James Wilson",
		email: "james34@outlook.com",
		amount: "$438.00",
		status: "processing"
	},
	{
		customer: "Sarah Jones",
		email: "sarah.j@yahoo.com",
		amount: "$692.00",
		status: "success"
	}
];
var exerciseMinutes = [
	{
		day: "Mon",
		minutes: 28
	},
	{
		day: "Tue",
		minutes: 42
	},
	{
		day: "Wed",
		minutes: 35
	},
	{
		day: "Thu",
		minutes: 58
	},
	{
		day: "Fri",
		minutes: 48
	},
	{
		day: "Sat",
		minutes: 62
	},
	{
		day: "Sun",
		minutes: 44
	}
];
var chatThread = [
	{
		author: "Sofia Davis",
		message: "Hi, how can I help you today?",
		isUser: false
	},
	{
		author: "You",
		message: "Hey, I'm having trouble with my account.",
		isUser: true
	},
	{
		author: "Sofia Davis",
		message: "What seems to be the problem?",
		isUser: false
	},
	{
		author: "You",
		message: "I can't log in.",
		isUser: true
	}
];
//#endregion
//#region src/app/islands/chat-card.tsx
function ChatCard({ contactName, contactEmail, contactInitials, messages: initialMessages }) {
	const [messages, setMessages] = useState(initialMessages);
	const [draft, setDraft] = useState("");
	const send = () => {
		const text = draft.trim();
		if (!text) return;
		setMessages((current) => [...current, {
			author: "You",
			message: text,
			isUser: true
		}]);
		setDraft("");
	};
	return /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsxs(CardHeader, {
		class: "flex flex-row items-center gap-3 space-y-0 pb-3",
		children: [
			/* @__PURE__ */ jsx(Avatar, {
				size: "sm",
				children: /* @__PURE__ */ jsx(AvatarFallback, { children: contactInitials })
			}),
			/* @__PURE__ */ jsxs("div", {
				class: "min-w-0",
				children: [/* @__PURE__ */ jsx(CardTitle, {
					class: "text-base",
					children: contactName
				}), /* @__PURE__ */ jsx("p", {
					class: "truncate text-xs text-muted-foreground",
					children: contactEmail
				})]
			}),
			/* @__PURE__ */ jsx("span", {
				class: "ms-auto text-xs text-muted-foreground",
				children: "New message"
			})
		]
	}), /* @__PURE__ */ jsxs(CardContent, {
		class: "space-y-4",
		children: [/* @__PURE__ */ jsx("div", {
			class: "max-h-48 space-y-3 overflow-y-auto rounded-md border bg-muted/20 p-3",
			children: messages.map((message, index) => /* @__PURE__ */ jsx("div", {
				class: `text-sm ${message.isUser ? "text-end" : "text-start"}`,
				children: /* @__PURE__ */ jsx("p", {
					class: `inline-block rounded-lg px-3 py-2 ${message.isUser ? "bg-primary text-primary-foreground" : "bg-muted"}`,
					children: message.message
				})
			}, `${message.author}-${index}`))
		}), /* @__PURE__ */ jsxs("div", {
			class: "flex gap-2",
			children: [/* @__PURE__ */ jsx(Input, {
				placeholder: "Type your message...",
				value: draft,
				onInput: (event) => setDraft(event.currentTarget.value),
				onKeyDown: (event) => {
					if (event.key === "Enter") {
						event.preventDefault();
						send();
					}
				}
			}), /* @__PURE__ */ jsx(Button, {
				onClick: send,
				children: "Send"
			})]
		})]
	})] });
}
ChatCard.__otokIslandId = "ChatCard";
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
Counter.__otokIslandId = "Counter";
//#endregion
//#region src/app/islands/payment-form.tsx
function PaymentForm() {
	return /* @__PURE__ */ jsxs(Card, {
		class: "col-span-4 lg:col-span-7",
		children: [/* @__PURE__ */ jsxs(CardHeader, { children: [/* @__PURE__ */ jsx(CardTitle, { children: "Payment Method" }), /* @__PURE__ */ jsx(CardDescription, { children: "Add a new payment method to your account." })] }), /* @__PURE__ */ jsxs(CardContent, {
			class: "space-y-6",
			children: [
				/* @__PURE__ */ jsxs(RadioGroup, {
					defaultValue: "card",
					class: "grid gap-3 sm:grid-cols-3",
					children: [
						/* @__PURE__ */ jsx(SelectableCard, {
							value: "card",
							children: /* @__PURE__ */ jsx("span", {
								class: "text-sm font-medium",
								children: "Card"
							})
						}),
						/* @__PURE__ */ jsx(SelectableCard, {
							value: "paypal",
							children: /* @__PURE__ */ jsx("span", {
								class: "text-sm font-medium",
								children: "Paypal"
							})
						}),
						/* @__PURE__ */ jsx(SelectableCard, {
							value: "apple",
							children: /* @__PURE__ */ jsx("span", {
								class: "text-sm font-medium",
								children: "Apple"
							})
						})
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					class: "grid gap-4 sm:grid-cols-2",
					children: [
						/* @__PURE__ */ jsxs("div", {
							class: "space-y-2 sm:col-span-2",
							children: [/* @__PURE__ */ jsx(Label, {
								for: "payment-name",
								children: "Name on the card"
							}), /* @__PURE__ */ jsx(Input, {
								id: "payment-name",
								placeholder: "John Doe",
								autoComplete: "off"
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							class: "space-y-2",
							children: [/* @__PURE__ */ jsx(Label, {
								for: "payment-city",
								children: "City"
							}), /* @__PURE__ */ jsx(Input, {
								id: "payment-city",
								placeholder: "Zurich",
								autoComplete: "off"
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							class: "space-y-2",
							children: [/* @__PURE__ */ jsx(Label, {
								for: "payment-card",
								children: "Card number"
							}), /* @__PURE__ */ jsx(Input, {
								id: "payment-card",
								placeholder: "1234 5678 9012 3456",
								autoComplete: "off"
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							class: "space-y-2",
							children: [/* @__PURE__ */ jsx(Label, {
								for: "payment-expires",
								children: "Expires"
							}), /* @__PURE__ */ jsx(Input, {
								id: "payment-expires",
								placeholder: "MM / YY",
								autoComplete: "off"
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							class: "space-y-2",
							children: [/* @__PURE__ */ jsx(Label, {
								for: "payment-cvc",
								children: "CVC"
							}), /* @__PURE__ */ jsx(Input, {
								id: "payment-cvc",
								placeholder: "123",
								autoComplete: "off"
							})]
						})
					]
				}),
				/* @__PURE__ */ jsx(Button, { children: "Continue" })
			]
		})]
	});
}
PaymentForm.__otokIslandId = "PaymentForm";
//#endregion
//#region src/app/islands/team-members.tsx
var roles = [
	"Viewer",
	"Developer",
	"Owner"
];
function TeamMembers({ members }) {
	return /* @__PURE__ */ jsxs(Card, {
		class: "col-span-4",
		children: [/* @__PURE__ */ jsxs(CardHeader, { children: [/* @__PURE__ */ jsx(CardTitle, { children: "Team Members" }), /* @__PURE__ */ jsx(CardDescription, { children: "Invite your team members to collaborate." })] }), /* @__PURE__ */ jsxs(CardContent, {
			class: "space-y-4",
			children: [members.map((member) => /* @__PURE__ */ jsxs("div", {
				class: "flex items-center justify-between gap-4",
				children: [/* @__PURE__ */ jsxs("div", {
					class: "flex min-w-0 items-center gap-3",
					children: [/* @__PURE__ */ jsx(Avatar, {
						size: "sm",
						children: /* @__PURE__ */ jsx(AvatarFallback, { children: member.initials })
					}), /* @__PURE__ */ jsxs("div", {
						class: "min-w-0",
						children: [/* @__PURE__ */ jsx("p", {
							class: "truncate text-sm font-medium",
							children: member.name
						}), /* @__PURE__ */ jsx("p", {
							class: "truncate text-xs text-muted-foreground",
							children: member.email
						})]
					})]
				}), /* @__PURE__ */ jsxs(Select, {
					defaultValue: member.role,
					children: [/* @__PURE__ */ jsx(SelectTrigger, {
						class: "w-[120px]",
						children: /* @__PURE__ */ jsx(SelectValue, {})
					}), /* @__PURE__ */ jsx(SelectContent, { children: roles.map((role) => /* @__PURE__ */ jsx(SelectItem, {
						value: role,
						children: role
					}, role)) })]
				})]
			}, member.email)), /* @__PURE__ */ jsx(Button, {
				variant: "outline",
				size: "sm",
				class: "w-full",
				children: "Invite Members"
			})]
		})]
	});
}
TeamMembers.__otokIslandId = "TeamMembers";
//#endregion
//#region src/app/routes/index.tsx
var routes_exports = /* @__PURE__ */ __exportAll({
	chrome: () => chrome$1,
	default: () => Home,
	head: () => head$3,
	loader: () => loader$1
});
var loader$1 = async () => ({
	initialCount: 5,
	dateRange: {
		from: "12 May 2026",
		to: "08 Jun 2026"
	},
	teamMembers,
	payments,
	exerciseMinutes,
	chatThread,
	stats: dashboardStats
});
var head$3 = () => ({
	title: "Dashboard | Otok Playground",
	description: "Shadcn-style admin dashboard built with Otok SSR and kamod-ui islands.",
	links: [{
		rel: "canonical",
		href: "https://example.com/"
	}],
	meta: {
		"og:title": "Otok Playground Dashboard",
		"og:type": "website"
	},
	jsonLd: {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name: "Otok Playground",
		applicationCategory: "DeveloperApplication"
	}
});
var chrome$1 = ({ data }) => ({
	title: "Dashboard",
	description: data.dateRange?.from && data.dateRange.to ? `${data.dateRange.from} - ${data.dateRange.to}` : "Otok dashboard",
	toolbar: /* @__PURE__ */ jsx(Island, {
		component: DashboardToolbar,
		props: {},
		strategy: "load"
	})
});
function Home({ data }) {
	const revenue = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD"
	}).format(data.stats.revenue.value);
	return /* @__PURE__ */ jsxs("div", {
		class: "grid gap-4 lg:grid-cols-7",
		children: [
			/* @__PURE__ */ jsx(Island, {
				component: TeamMembers,
				props: { members: data.teamMembers },
				strategy: "visible",
				rootMargin: "160px"
			}),
			/* @__PURE__ */ jsxs("div", {
				class: "col-span-3 flex flex-col gap-4",
				children: [
					/* @__PURE__ */ jsx(StatCard, {
						title: "Subscriptions",
						value: `+${data.stats.subscriptions.value.toLocaleString()}`,
						change: data.stats.subscriptions.change
					}),
					/* @__PURE__ */ jsx(StatCard, {
						title: "Total Revenue",
						value: revenue,
						change: data.stats.revenue.change
					}),
					/* @__PURE__ */ jsx(Island, {
						component: ChatCard,
						props: {
							contactName: "Sofia Davis",
							contactEmail: "m@example.com",
							contactInitials: "SD",
							messages: data.chatThread
						},
						strategy: "visible",
						rootMargin: "160px"
					})
				]
			}),
			/* @__PURE__ */ jsx(ExerciseChart, { data: data.exerciseMinutes }),
			/* @__PURE__ */ jsx(PaymentsTable, { payments: data.payments }),
			/* @__PURE__ */ jsx(Island, {
				component: PaymentForm,
				props: {},
				strategy: "visible",
				rootMargin: "160px"
			}),
			/* @__PURE__ */ jsxs(Card, {
				class: "col-span-4 lg:col-span-3",
				children: [/* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Otok island demo" }) }), /* @__PURE__ */ jsxs(CardContent, {
					class: "space-y-4",
					children: [/* @__PURE__ */ jsx(Island, {
						component: Counter,
						props: { init: data.initialCount }
					}), /* @__PURE__ */ jsxs("div", {
						class: "flex flex-wrap gap-2",
						children: [
							/* @__PURE__ */ jsx(Button, {
								href: "/about",
								variant: "outline",
								size: "sm",
								children: "Zero-JS route"
							}),
							/* @__PURE__ */ jsx(Button, {
								href: "/demo",
								variant: "outline",
								size: "sm",
								children: "kamod-ui islands"
							}),
							/* @__PURE__ */ jsx(Badge, {
								variant: "secondary",
								children: "SSR + islands"
							})
						]
					})]
				})]
			})
		]
	});
}
//#endregion
//#region src/app/routes/docs/[...slug].tsx
var ____slug__exports = /* @__PURE__ */ __exportAll({
	chrome: () => chrome,
	default: () => DocsPage,
	head: () => head$2,
	loader: () => loader
});
var loader = ({ params }) => ({
	slug: params.slug,
	segments: params.slug.split("/")
});
var head$2 = ({ data }) => ({ title: `Docs ${data.slug} | Otok Playground` });
var chrome = () => ({
	title: "Catch-all route",
	description: "A catch-all route powered by Otok file routing."
});
function DocsPage({ data }) {
	return /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Catch-all docs route" }) }), /* @__PURE__ */ jsxs(CardContent, {
		class: "space-y-4",
		children: [
			/* @__PURE__ */ jsx(Badge, { children: "/docs/[...slug]" }),
			/* @__PURE__ */ jsxs("p", {
				class: "text-muted-foreground",
				children: ["Loaded docs slug: ", data.slug]
			}),
			/* @__PURE__ */ jsx("div", {
				class: "flex flex-wrap gap-2",
				children: data.segments.map((segment) => /* @__PURE__ */ jsx(Badge, {
					variant: "secondary",
					children: segment
				}, segment))
			})
		]
	})] });
}
//#endregion
//#region src/app/routes/_not-found.tsx
var _not_found_exports = /* @__PURE__ */ __exportAll({
	default: () => NotFound,
	head: () => head$1
});
var head$1 = () => ({ title: "Not found | Otok Playground" });
function NotFound() {
	return /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Page not found" }) }), /* @__PURE__ */ jsxs(CardContent, {
		class: "space-y-4",
		children: [/* @__PURE__ */ jsx("p", {
			class: "text-muted-foreground",
			children: "Otok rendered this 404 through the route convention."
		}), /* @__PURE__ */ jsx(Button, {
			href: "/",
			variant: "outline",
			size: "sm",
			children: "Back to dashboard"
		})]
	})] });
}
//#endregion
//#region src/app/routes/_error.tsx
var _error_exports = /* @__PURE__ */ __exportAll({
	default: () => ErrorRoute,
	head: () => head
});
var head = () => ({ title: "Error | Otok Playground" });
function ErrorRoute({ data }) {
	return /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Something went wrong" }) }), /* @__PURE__ */ jsxs(CardContent, {
		class: "space-y-3 text-sm text-muted-foreground",
		children: [/* @__PURE__ */ jsxs("p", { children: ["Status: ", data.status ?? 500] }), /* @__PURE__ */ jsx("p", { children: data.message ?? "The error route handled this failure." })]
	})] });
}
//#endregion
//#region src/app/components/dashboard-nav.ts
var dashboardNavGroups = [{
	label: "Dashboards",
	items: [{
		label: "Classic Dashboard",
		href: "/"
	}]
}, {
	label: "Pages",
	items: [
		{
			label: "Zero-JS route",
			href: "/about"
		},
		{
			label: "kamod-ui islands",
			href: "/demo"
		},
		{
			label: "Progressive forms",
			href: "/projects"
		},
		{
			label: "Catch-all docs",
			href: "/docs/routing/catch-all",
			match: (route) => route.startsWith("/docs/") || route === "/docs/:slug*"
		},
		{
			label: "Dynamic route",
			href: "/users/alice",
			match: (route) => route.startsWith("/users/") || route === "/users/:id"
		}
	]
}];
function isNavItemActive(route, item) {
	if (item.match) return item.match(route);
	return route === item.href || item.href !== "/" && route === item.href;
}
//#endregion
//#region src/app/components/dashboard-shell.tsx
function SidebarNav({ route }) {
	return /* @__PURE__ */ jsx("nav", {
		class: "flex flex-col gap-4 px-2 py-4",
		"data-otok-swap": "sidebar-nav",
		children: dashboardNavGroups.map((group) => /* @__PURE__ */ jsxs("details", {
			open: true,
			class: "group",
			children: [/* @__PURE__ */ jsx("summary", {
				class: "cursor-pointer list-none px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground [&::-webkit-details-marker]:hidden",
				children: group.label
			}), /* @__PURE__ */ jsx("ul", {
				class: "mt-2 flex flex-col gap-1",
				children: group.items.map((item) => {
					const active = isNavItemActive(route, item);
					return /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", {
						href: item.href,
						"aria-current": active ? "page" : void 0,
						class: `block rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted ${active ? "bg-muted font-medium text-foreground" : "text-muted-foreground"}`,
						children: item.label
					}) }, item.href);
				})
			})]
		}, group.label))
	});
}
function DashboardShell({ route, title, description, toolbar, children }) {
	return /* @__PURE__ */ jsxs("div", {
		class: "flex min-h-screen bg-background",
		children: [/* @__PURE__ */ jsxs("aside", {
			class: "hidden w-64 shrink-0 border-r bg-muted/20 lg:flex lg:flex-col",
			children: [
				/* @__PURE__ */ jsx("div", {
					class: "flex h-14 items-center border-b px-4",
					children: /* @__PURE__ */ jsx("a", {
						href: "/",
						class: "text-sm font-semibold tracking-tight",
						children: "Otok Playground"
					})
				}),
				/* @__PURE__ */ jsx("div", {
					class: "flex-1 overflow-y-auto",
					children: /* @__PURE__ */ jsx(SidebarNav, { route })
				}),
				/* @__PURE__ */ jsx("div", {
					class: "border-t p-4",
					children: /* @__PURE__ */ jsxs("div", {
						class: "flex items-center gap-3",
						children: [/* @__PURE__ */ jsx(Avatar, {
							size: "sm",
							children: /* @__PURE__ */ jsx(AvatarFallback, { children: dashboardUser.initials })
						}), /* @__PURE__ */ jsxs("div", {
							class: "min-w-0",
							children: [/* @__PURE__ */ jsx("p", {
								class: "truncate text-sm font-medium",
								children: dashboardUser.name
							}), /* @__PURE__ */ jsx("p", {
								class: "truncate text-xs text-muted-foreground",
								children: dashboardUser.email
							})]
						})]
					})
				})
			]
		}), /* @__PURE__ */ jsxs("div", {
			class: "flex min-w-0 flex-1 flex-col",
			children: [/* @__PURE__ */ jsxs("header", {
				class: "sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60",
				"data-otok-swap": "header",
				children: [
					/* @__PURE__ */ jsxs("details", {
						class: "lg:hidden",
						children: [/* @__PURE__ */ jsx("summary", {
							class: "cursor-pointer list-none rounded-md border px-2.5 py-1.5 text-sm [&::-webkit-details-marker]:hidden",
							children: "Menu"
						}), /* @__PURE__ */ jsx("div", {
							class: "absolute left-0 right-0 top-14 z-20 border-b bg-background p-4 shadow-sm",
							children: /* @__PURE__ */ jsx(SidebarNav, { route })
						})]
					}),
					toolbar,
					/* @__PURE__ */ jsx("div", {
						class: "ms-auto flex items-center gap-2",
						children: /* @__PURE__ */ jsx(Avatar, {
							size: "sm",
							class: "lg:hidden",
							children: /* @__PURE__ */ jsx(AvatarFallback, { children: dashboardUser.initials })
						})
					})
				]
			}), /* @__PURE__ */ jsxs("main", {
				class: "flex-1 p-4 md:p-6",
				children: [
					/* @__PURE__ */ jsxs("div", {
						class: "mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
						"data-otok-swap": "page-heading",
						children: [/* @__PURE__ */ jsxs("div", {
							class: "space-y-1",
							children: [/* @__PURE__ */ jsx("h1", {
								class: "text-2xl font-semibold tracking-tight md:text-3xl",
								children: title
							}), description ? /* @__PURE__ */ jsx("p", {
								class: "text-sm text-muted-foreground",
								children: description
							}) : null]
						}), /* @__PURE__ */ jsx("div", {
							class: "flex items-center gap-2",
							children: /* @__PURE__ */ jsx(Button, {
								variant: "outline",
								size: "sm",
								children: "Download"
							})
						})]
					}),
					/* @__PURE__ */ jsx(Separator, { class: "mb-6" }),
					children
				]
			})]
		})]
	});
}
//#endregion
//#region src/app/routes/_layout.tsx
var _layout_exports = /* @__PURE__ */ __exportAll({ default: () => Layout });
var defaultChrome = {
	title: "Otok Playground",
	description: "Server-rendered Preact with islands."
};
function Layout({ children, chrome, route }) {
	const resolved = chrome ?? defaultChrome;
	return /* @__PURE__ */ jsx(DashboardShell, {
		route,
		title: resolved.title ?? "Otok Playground",
		description: resolved.description ?? defaultChrome.description,
		toolbar: resolved.toolbar,
		children
	});
}
//#endregion
//#region src/server.ts
var app = createOtokApp({
	routes: [
		{
			id: "about",
			path: "/about",
			pattern: /* @__PURE__ */ new RegExp("^/about/?$"),
			params: [],
			module: about_exports,
			layouts: [_layout_exports]
		},
		{
			id: "boom",
			path: "/boom",
			pattern: /* @__PURE__ */ new RegExp("^/boom/?$"),
			params: [],
			module: boom_exports,
			layouts: [_layout_exports]
		},
		{
			id: "demo",
			path: "/demo",
			pattern: /* @__PURE__ */ new RegExp("^/demo/?$"),
			params: [],
			module: demo_exports,
			layouts: [_layout_exports]
		},
		{
			id: "projects",
			path: "/projects",
			pattern: /* @__PURE__ */ new RegExp("^/projects/?$"),
			params: [],
			module: projects_exports,
			layouts: [_layout_exports]
		},
		{
			id: "users.[id]",
			path: "/users/:id",
			pattern: /* @__PURE__ */ new RegExp("^/users/([^/]+)/?$"),
			params: ["id"],
			module: _id__exports,
			layouts: [_layout_exports]
		},
		{
			id: "index",
			path: "/",
			pattern: /* @__PURE__ */ new RegExp("^/?$"),
			params: [],
			module: routes_exports,
			layouts: [_layout_exports]
		},
		{
			id: "docs.[...slug]",
			path: "/docs/:slug*",
			pattern: /* @__PURE__ */ new RegExp("^/docs/(.+)/?$"),
			params: ["slug"],
			module: ____slug__exports,
			layouts: [_layout_exports]
		}
	],
	notFoundRoute: {
		id: "_not-found",
		path: "/",
		pattern: /* @__PURE__ */ new RegExp("^/?$"),
		params: [],
		module: _not_found_exports,
		layouts: [_layout_exports]
	},
	errorRoute: {
		id: "_error",
		path: "/",
		pattern: /* @__PURE__ */ new RegExp("^/?$"),
		params: [],
		module: _error_exports,
		layouts: [_layout_exports]
	},
	manifest: readOtokManifest(import.meta.url),
	clientEntry: "src/client.ts",
	devClientEntry: "/src/client.ts",
	devStylesheets: ["/src/style.css"],
	staticDir: "./dist/client",
	health: {
		ok: true,
		framework: "otok"
	},
	theme: true
});
serve({
	fetch: app.fetch,
	port: Number(process.env.PORT ?? 3e3)
});
//#endregion
export { app as default };
