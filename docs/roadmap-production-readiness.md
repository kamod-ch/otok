# Otok Phase 1 Production-Readiness Roadmap

## Aktueller Stand (0.2.0+)

Phase 1 APIs are implemented and covered by unit/E2E tests. Remaining work is hardening (0.3.x/0.4.x): `validationError` / `parseHtml` polish, docs sync, examples CI, multi-browser E2E, and Kamod decoupling.

### Architektur und Package-Verantwortung

Otok is a pnpm monorepo with four publishable packages and reference apps:

- `packages/otok`: Framework runtime — Hono SSR, Preact, routing, actions, middleware, islands, soft navigation.
- `packages/vite-plugin-otok`: File scanner, `virtual:otok-routes` / `virtual:otok-islands`, typed `route()` builder.
- `packages/create-otok`: CLI and templates (minimal + full synced from playground).
- `packages/otok-test`: Server-side test helpers including `parseHtml`.
- `apps/playground`: Node/Vite reference app with Playwright E2E.
- `apps/docs`: Product documentation site.
- `examples/`: Reference apps and Node deployment sample.

Workspace checks: `pnpm check`, `pnpm test:e2e`, Changesets release workflow on `main`.

### Laufzeitmodell

- Route modules export `default`, optional `loader`, `action`, `head`, `chrome`, and `client`.
- Special files: `_layout.tsx`, `_not-found.tsx`, `_error.tsx`, `_middleware.ts`.
- Helpers: `redirect`, `notFound`, `fail`, `validationError`, `json`.
- Soft navigation supports links and opt-in progressive forms.

### Tests und Qualität

Unit coverage includes handlers, actions, middleware, validation, HTML, hydration, soft nav, Vite plugin, create-otok, and `@otok/test`.

Playground E2E covers zero-JS routes, islands, soft nav, forms (with JS disabled), middleware, errors, and production health/assets.

Reference examples exist under `examples/` and should also run in CI (`pnpm check:examples`).

## Definition von Production Ready für Phase 1

Otok gilt für Phase 1 als produktionsfähig, wenn:

1. SSR-Seiten, Islands und Soft Navigation zuverlässig mit Node betrieben werden können.
2. Formulare ohne Client-JavaScript funktionieren und optional progressiv verbessert werden können.
3. Mutationen, Redirects, Fehler und Validation-Ergebnisse konsistent und sicher behandelt werden.
4. Route-lokale Middleware möglich ist, ohne Hono-Middleware neu zu erfinden.
5. Route-URLs typisiert gebaut werden können, ohne Runtime-Virtual-Module mit TypeScript-Syntax zu brechen.
6. Apps Test-Utilities für Handler, HTML, Actions und Islands erhalten.
7. E2E-Tests die wichtigsten produktionskritischen Flows abdecken.
8. Node-Deployment mit dokumentierten Build-, Start-, Health- und Static-Asset-Konventionen abgesichert ist.
9. Dokumentation, Templates, Scaffold-Sync, Changesets und GitHub Releases zusammenpassen.
10. Mindestens zwei reale Referenzprojekte die API außerhalb des Playgrounds validieren.

## Zielarchitektur Phase 1

```text
packages/
  otok/                 Core Runtime, Types, Server, Client, Shared Helpers
  vite-plugin-otok/     File Scanner, Virtual Modules, Typed Route Metadata
  create-otok/          CLI und Templates
  otok-test/            Optionales neues Package für Testing Utilities
apps/
  playground/           Full UI Referenz und E2E Harness
  reference-*/          Zwei reale Referenzprojekte oder externe Repos mit CI
```

`packages/otok-test` ist nur sinnvoll, wenn die Test-Helfer mehr als einfache Re-Exports aus `otok/server` benötigen. Falls die erste Implementierung klein bleibt, sollten die Utilities zunächst in `otok/server/testing` oder als Export aus `otok/server` vermieden werden, da das aktuelle Export-Layout keine Subpath-Exports für Testing hat. Ein eigenes Package verhindert, dass Testing-Abhängigkeiten in die Runtime gelangen.

Nicht in den Core gehören feste Abhängigkeiten auf Kamod UI, Tailwind, eine Validation-Library, Datenbank, Auth-System, Icons, Signals oder Hooks.

## Priorisierte Arbeitspakete

> Status legend: **done** = shipped in 0.2.0+, **hardening** = remaining polish for 0.3.x/0.4.x, **phase2** = deferred to 1.x.

### P0. Response-, Error- und Validation-Semantik vereinheitlichen — **done** (+ `validationError` hardening)

Helpers `redirect`, `notFound`, `fail`, and `validationError` share one failure model. Unexpected errors stay hidden unless `exposeErrorDetails` is enabled.

### P1. Route Actions — **done**

### P2. Progressive Forms — **done**

### P3. Route-Level Middleware — **done**

### P4. Typed Route Builder — **done** (add dedicated package type-tests as hardening)

### P5. Testing Utilities — **done** (`@otok/test` + `parseHtml`)

### P6. E2E-Ausbau für Forms, Soft Navigation und Islands — **done** (multi-browser is hardening)

### P7. Node Production Deployment — **done**

### P8. Dokumentation — **done** (`apps/docs`; keep ADRs/roadmap synced)

### P9. GitHub Releases und Release-Automatisierung — **done**

### P10. Zwei reale Otok-Referenzprojekte — **done** under `examples/` (wire into CI as hardening)

## Frühere Detailpläne

### P0. Response-, Error- und Validation-Semantik vereinheitlichen

- Ziel: Eine gemeinsame Normalisierung für Redirects, `Response`, HTTP-Fehler, Validation-Ergebnisse und unerwartete Fehler schaffen.
- Motivation: Actions, Forms und Middleware brauchen dieselbe Sicherheits- und Statuscode-Semantik.
- Betroffene Packages und Dateien: `packages/otok/src/shared/routes.ts`, `packages/otok/src/server/index.tsx`, `packages/otok/src/server/index.test.tsx`, `docs/conventions.md`.
- Vorgeschlagene öffentliche API:

```ts
validationError({
  message?: string,
  fieldErrors?: Record<string, string | string[]>,
  formErrors?: string[],
  values?: Record<string, JsonValue>,
  status?: 400 | 422,
});
```

- Interne Umsetzung: Response-Normalizer einführen, der Rückgaben und geworfene Werte aus Loadern, Actions und Middleware in eine `Response` oder Render-Daten übersetzt. Bestehende `redirect`, `notFound`, `fail` bleiben unverändert.
- Risiken: Zu frühe Festlegung der Validation-Shape; versehentliches Leaken unerwarteter Fehlerdetails.
- Breaking-Change-Risiko: Niedrig, wenn additive Helper und bestehende Fehlerpfade unverändert bleiben.
- Unit-Tests: Redirect-Status 303/302, `Response` passthrough, Validation 400/422, unerwarteter Fehler verborgen, `exposeErrorDetails` weiterhin wirksam.
- E2E-Tests: Noch nicht erforderlich, aber später durch Forms genutzt.
- Dokumentation: Error- und Validation-Modell in `docs/conventions.md` und später PreactPress.
- Abnahmekriterien: Alle bisherigen Error-Tests grün; neue Tests bestätigen keine Rohdetails bei 500; Helper sind aus `otok/server` und `otok/shared` typisiert nutzbar.
- Komplexität: M.
- Abhängigkeiten: Keine.

### P1. Route Actions

- Ziel: Route-Module können Mutationen über `action` behandeln.
- Motivation: Server-first Forms und progressive Enhancement brauchen route-lokale Schreiblogik.
- Betroffene Packages und Dateien: `packages/otok/src/shared/routes.ts`, `packages/otok/src/server/index.tsx`, Server-Tests, Playground-Routen für Demo.
- Vorgeschlagene öffentliche API:

```ts
export const action: OtokAction = async ({ request, formData, params, hono, route }) => {
  return { ok: true };
};
```

- Interne Umsetzung: `createOtokHandler()` anhand HTTP-Methode verzweigen. GET/HEAD rendern wie bisher. POST/PUT/PATCH/DELETE matchen Route und rufen `route.module.action`. `FormData` lazy oder einmalig parsen. Fehlende Action ergibt `405` plus `Allow`.
- Risiken: Body kann nur einmal gelesen werden; Action-Daten-Prop muss stabil gewählt werden; HEAD darf nicht versehentlich Body erzeugen.
- Breaking-Change-Risiko: Niedrig bis mittel. Neue Methode-Dispatch darf GET nicht verändern.
- Unit-Tests: Action wird für POST aufgerufen; 405 ohne Action; Redirect aus Action; Validation aus Action; Raw `Response`; Loader-Reihenfolge nach Action-Re-Render.
- E2E-Tests: Einfache native POST-Form im Playground.
- Dokumentation: Route Actions, PRG-Pattern, Statuscodes, Sicherheit.
- Abnahmekriterien: Native Form kann ohne JS posten, Validation rendern und redirecten; zero-JS-Seiten bleiben möglich.
- Komplexität: L.
- Abhängigkeiten: P0.

### P2. Progressive Forms

- Ziel: Native HTML Forms bleiben Baseline; Soft Navigation kann Forms optional verbessern.
- Motivation: Kein JS darf Voraussetzung für Mutationen sein; mit JS sollen Page-Swaps ohne Vollreload möglich sein.
- Betroffene Packages und Dateien: `packages/otok/src/client/soft-nav.ts`, `packages/otok/src/client/index.tsx`, Soft-Nav-Tests, Playground-E2E.
- Vorgeschlagene öffentliche API:

```ts
createOtokClient({
  registry: islandModules,
  softNav: { forms: true },
});
```

- Interne Umsetzung: Submit-Listener analog Link-Handler. Eligible Forms prüfen, `FormData` mit Fetch senden, HTML parsen, `applySoftNavigationDocument()` nutzen, History und Scroll behandeln. Bei Unsupported Cases native Submission zulassen.
- Risiken: Doppel-Submit, File-Uploads, Submitter-Buttons, HTTP-Methoden jenseits GET/POST, Fokusmanagement, Race Conditions mit Link-Navigation.
- Breaking-Change-Risiko: Niedrig, wenn opt-in.
- Unit-Tests: Eligibility, no-nav, external target, submitter method/action, fallback bei non-HTML.
- E2E-Tests: Native no-JS Submit, enhanced Submit, Validation bleibt sichtbar, Redirect aktualisiert URL, Islands nach Submit hydratisieren.
- Dokumentation: HTML-first Forms, opt-in Enhancement, Accessibility.
- Abnahmekriterien: Forms funktionieren mit deaktiviertem JS; opt-in Enhancement ersetzt Page-Region und erhält Security-Fallbacks.
- Komplexität: L.
- Abhängigkeiten: P1.

### P3. Route-Level Middleware

- Ziel: Route- und Layout-Module können serverseitige Middleware deklarieren.
- Motivation: Auth, Headers und Preconditions sollen route-lokal sein, aber Hono wiederverwenden.
- Betroffene Packages und Dateien: `packages/otok/src/shared/routes.ts`, `packages/otok/src/server/index.tsx`, `packages/vite-plugin-otok/src/index.ts` nur falls Layout-Metadaten erweitert werden müssen.
- Vorgeschlagene öffentliche API:

```ts
export const middleware: OtokMiddleware[] = [requireUser];
```

- Interne Umsetzung: Matched Route enthält Layout-Module bereits. Middleware aus Layouts root-to-leaf plus Route sammeln und vor Loader/Action ausführen. Short-circuit `Response` respektieren. `c.set()`/`c.get()` für Datenweitergabe nutzen.
- Risiken: Hono-Middleware-Compatibility, Next-Semantik, Fehler-Propagation, Middleware in Error-Routen.
- Breaking-Change-Risiko: Niedrig, additive Exports.
- Unit-Tests: Reihenfolge, short-circuit, redirect, Fehlerroute, Daten via Hono Context.
- E2E-Tests: Geschützte Demo-Route mit Redirect.
- Dokumentation: Wann App-Level `configure` vs route-level Middleware nutzen.
- Abnahmekriterien: Hono-ähnliche Middleware lässt sich pro Route/Layout nutzen; globale Middleware bleibt unverändert.
- Komplexität: M/L.
- Abhängigkeiten: P0, vorzugsweise P1 wegen gemeinsamer Pipeline.

### P4. Typed Route Builder

- Ziel: Bekannte Route-Patterns typisiert in URLs umwandeln.
- Motivation: Weniger Stringfehler bei Links, Redirects und Forms.
- Betroffene Packages und Dateien: `packages/vite-plugin-otok/src/index.ts`, `packages/vite-plugin-otok/client.d.ts`, Plugin-Tests, evtl. `packages/otok/src/shared` für generische Types.
- Vorgeschlagene öffentliche API:

```ts
import { href } from "virtual:otok-routes";

href("/users/:id", { id: "alice" });
href("/docs/:slug*", { slug: ["routing", "catch-all"], query: { tab: "api" } });
```

- Interne Umsetzung: Runtime-Virtual-Modul bleibt JS-only. Helper aus Route-Metadaten erzeugen; Typen über separate deklarative Strategie oder generische Ambient-Fallbacks ergänzen. Keine `as const` oder `export type` im Runtime-Code.
- Risiken: Vite/Rolldown Parse-Fehler durch TS-Syntax; Type-Tests in Monorepo aufwendig; Catch-all Encoding.
- Breaking-Change-Risiko: Niedrig, wenn bestehende Exports bleiben.
- Unit-Tests: Runtime URL-Erzeugung, fehlende Params in Dev, Encoding.
- Type-Tests: `tsc --noEmit` Fixture mit erwarteten Fehlern für fehlende/falsche Params.
- E2E-Tests: Nicht nötig außer Nutzung im Playground.
- Dokumentation: Links, Redirects, Forms mit typed routes.
- Abnahmekriterien: Runtime Build bleibt grün; bekannte Routen werden typisiert; kein TS-Code im virtuellen Runtime-Modul.
- Komplexität: L.
- Abhängigkeiten: Keine harte, aber nach P1/P2 nützlich.

### P5. Testing Utilities

- Ziel: Apps können Routes, Actions, Loader, HTML und Islands einfach testen.
- Motivation: Production Readiness hängt von App-Testbarkeit ab; sonst werden Actions/Middleware schwer sicher zu verwenden.
- Betroffene Packages und Dateien: Neues `packages/otok-test` oder additive Exports in `packages/otok`; Root workspace; Tests; README.
- Vorgeschlagene öffentliche API:

```ts
import { createTestApp, requestRoute, parseHtml } from "otok-test";
```

- Interne Umsetzung: Dünne Helfer um Hono `app.request`, `createOtokHandler`, DOMParser/jsdom-freie HTML Assertions soweit möglich. Keine Runtime-Abhängigkeiten in `otok` erzwingen.
- Risiken: Neues Package erhöht Release-Oberfläche; zu viele Test-Abstraktionen können Hono verdecken.
- Breaking-Change-Risiko: Niedrig.
- Unit-Tests: Utility-eigene Tests mit Mini-Routes und Actions.
- E2E-Tests: Nicht direkt.
- Dokumentation: Testing Guide mit Vitest und Playwright.
- Abnahmekriterien: Ein Minimal-App-Test kann Loader, Action Redirect und Validation ohne Boilerplate prüfen.
- Komplexität: M.
- Abhängigkeiten: P1, P0.

### P6. E2E-Ausbau für Forms, Soft Navigation und Islands

- Ziel: Produktkritische Browser-Flows absichern.
- Motivation: Soft Navigation, Hydration und Forms sind integrationslastig und können in Unit-Tests nicht vollständig abgesichert werden.
- Betroffene Packages und Dateien: `apps/playground/e2e`, `apps/playground/src/app/routes`, `apps/playground/src/app/islands`, Playwright Config.
- Vorgeschlagene API: Keine neue API; E2E-Verbrauch der Phase-1-APIs.
- Interne Umsetzung: Neue Demo-Routen für native und enhanced Forms, Middleware-Redirect, typed route usage und island rehydration after submit.
- Risiken: Flaky Tests durch Dev/Build-Server, Reference-App wird zu groß.
- Breaking-Change-Risiko: Keins.
- Unit-Tests: Nicht zutreffend.
- E2E-Tests: JS disabled native Form, JS enabled enhanced Form, soft nav back/forward, island after soft nav, failed action validation, redirect after action.
- Dokumentation: Tests als Beispiel im Docs-Guide referenzieren.
- Abnahmekriterien: `pnpm test:e2e` deckt alle neuen Flows stabil in Chromium ab.
- Komplexität: M.
- Abhängigkeiten: P1, P2, P3 teilweise.

### P7. Node Production Deployment

- Ziel: Node als primäre Phase-1-Runtime klar absichern.
- Motivation: Nutzer brauchen verlässliche Build-, Start-, Asset- und Health-Konventionen.
- Betroffene Packages und Dateien: `packages/create-otok/template*`, `apps/playground/vite.config.ts`, `docs`, evtl. `packages/otok/src/server/manifest.ts`.
- Vorgeschlagene öffentliche API: Keine zwingende neue API; evtl. `readOtokManifest()` Optionen dokumentieren.
- Interne Umsetzung: Production smoke test für `pnpm build && pnpm start`, statische Assets, Manifest-CSS, Health, 404/500. Dokumentiere Docker/Node-Beispiel ohne neue Runtime-Abhängigkeit.
- Risiken: Build-Artefakte im Repo können Checks beeinflussen; Start-Port-Kollisionen.
- Breaking-Change-Risiko: Niedrig.
- Unit-Tests: Manifest-Pfad und Asset-URL-Tests.
- E2E-Tests: Bereits Playwright über Production Build; um Health/Assets erweitern.
- Dokumentation: Deployment Guide, environment variables, `PORT`, reverse proxy, caching.
- Abnahmekriterien: Frisch gescaffoldete App lässt sich bauen und per Node starten; Assets und CSS laden vor Paint; Health antwortet.
- Komplexität: M.
- Abhängigkeiten: P6 empfohlen.

### P8. Dokumentation mit PreactPress

- Ziel: Vollständige Dokumentationsseite für Otok.
- Motivation: README und `docs/conventions.md` reichen für Production Adoption nicht aus.
- Betroffene Packages und Dateien: Neues Docs-App-Verzeichnis nach Entscheidung, `docs`, README, ggf. CI.
- Vorgeschlagene öffentliche API: Keine; Dokumentation der bestehenden und neuen APIs.
- Interne Umsetzung: PreactPress als Docs-App nur hinzufügen, wenn es den Core nicht belastet. Inhalte aus README, Konventionen, ADRs und Roadmap strukturieren.
- Risiken: Docs-Tooling kann Monorepo-Checks verlangsamen; PreactPress-Abhängigkeit darf nicht in Core geraten.
- Breaking-Change-Risiko: Keins.
- Unit-Tests: Link-/Build-Check der Docs-App.
- E2E-Tests: Optional smoke test Docs Startseite.
- Dokumentation: Guides für Quick Start, Routing, Actions, Forms, Middleware, Typed Routes, Testing, Deployment, Security, Releases.
- Abnahmekriterien: Docs buildet in CI; Public APIs sind mit Beispielen dokumentiert; ADRs bleiben verlinkt.
- Komplexität: M/L.
- Abhängigkeiten: P0-P7 API-stabil genug.

### P9. GitHub Releases und Release-Automatisierung

- Ziel: Reproduzierbarer Release-Prozess mit Changesets, CI und GitHub Releases.
- Motivation: `docs/release.md` beschreibt manuelle Schritte, aber keine automatisierte Release-Pipeline.
- Betroffene Packages und Dateien: `.github/workflows`, `package.json`, `docs/release.md`, Changesets-Konfiguration falls nötig.
- Vorgeschlagene öffentliche API: Keine.
- Interne Umsetzung: Changesets Release PR Workflow, publish job mit npm token, GitHub release notes, `pack:check` als Gate. Keine Veröffentlichung aus unsauberem Tree.
- Risiken: Token-/Permission-Fehler, versehentliches Publishen privater Artefakte, Version Drift zwischen Templates und Packages.
- Breaking-Change-Risiko: Keins.
- Unit-Tests: Keine.
- E2E-Tests: CI muss `pnpm check`, `pack:check`, `test:e2e` ausführen.
- Dokumentation: Release-Runbook aktualisieren.
- Abnahmekriterien: Release PR wird automatisch erstellt; Publish nur nach Merge/Approval; GitHub Release enthält Changesets.
- Komplexität: M.
- Abhängigkeiten: P8 optional, P7 empfohlen.

### P10. Zwei reale Otok-Referenzprojekte

- Ziel: Otok APIs außerhalb des Playgrounds validieren.
- Motivation: Playground nutzt Kamod UI und Tailwind; Core muss unabhängig und realitätsnah bleiben.
- Betroffene Packages und Dateien: Entweder `apps/reference-*` im Monorepo oder externe Repos mit dokumentierter CI; README/Docs Verweise.
- Vorgeschlagene öffentliche API: Keine; Referenzen verbrauchen öffentliche APIs.
- Interne Umsetzung: Zwei kleine, echte Anwendungen definieren, z. B. Blog/Docs ohne UI-Library und Mini-CRUD mit native Forms und Auth-Middleware. Keine Kamod-Abhängigkeit in mindestens einem Projekt.
- Risiken: Wartungsaufwand; Referenzen dürfen nicht zu Demo-Spielzeug oder zu Produktcode mit Secrets werden.
- Breaking-Change-Risiko: Keins.
- Unit-Tests: Referenzspezifisch.
- E2E-Tests: Smoke pro Referenz: build, start, route, form/action.
- Dokumentation: Case studies und API Lessons Learned.
- Abnahmekriterien: Beide Referenzen bauen in CI; mindestens eine nutzt Forms/Actions/Middleware; mindestens eine bleibt zero/low JS.
- Komplexität: L.
- Abhängigkeiten: P1-P7.

## Meilensteine

### M1: Server-Semantik stabil

Enthält P0 und P1. Ergebnis: Actions, Redirects, Validation und sichere Fehlerdetails sind serverseitig definiert und getestet.

### M2: Progressive UX stabil

Enthält P2, P3 und P6-Basis. Ergebnis: Forms, Soft Navigation und route-level Middleware funktionieren in Unit- und E2E-Tests.

### M3: DX und Deployment

Enthält P4, P5 und P7. Ergebnis: Typed Routes, Testing Utilities und Node Deployment sind verwendbar und dokumentiert.

### M4: Adoption und Release

Enthält P8, P9 und P10. Ergebnis: Dokumentation, Release-Automatisierung und reale Referenzen sind bereit.

## Release-Ziel

Phase 1 sollte als `0.3.0` oder `0.4.0` veröffentlicht werden, abhängig davon, ob Route Actions und Progressive Forms gemeinsam oder in separaten minor Releases landen. Breaking Changes sollten vermieden werden; falls TypeScript-Public-Types angepasst werden müssen, braucht das einen Changeset mit klarer Migrationsnotiz.

## Bekannte Risiken

- Runtime-Virtual-Module dürfen keine TypeScript-Syntax enthalten.
- Form-Enhancement darf native Form-Semantik nicht verschlechtern.
- Seiten ohne Islands sollen in Production weiterhin kein unnötiges Client-JavaScript laden.
- Error-Details dürfen standardmäßig nicht an Clients gelangen.
- Hono-Middleware-Kompatibilität kann komplizierter sein als eine eigene Middleware-Signatur.
- Ein neues Testing-Package erhöht Release- und Versionierungsaufwand.
- Playground-Artefakte unter `dist` können bei Builds den Working Tree verändern, falls sie versioniert bleiben.
- Full Template hängt bewusst an Kamod UI/Tailwind; Minimal Template muss die Core-Unabhängigkeit zeigen.

## Ausdrücklich nicht enthalten

- Allgemeines Plugin-System.
- Edge-/Worker-Runtime als primäres Ziel.
- Vorgeschriebene Validation-, Database- oder Auth-Bibliothek.
- Kamod UI, Tailwind oder Icons als Core-Abhängigkeit.
- Client-side Router als Ersatz für SSR.
- Server Components oder Streaming als Phase-1-Anforderung.
- Internationalisierungssystem.
- Asset-Pipeline außerhalb von Vite.

## Empfohlene Reihenfolge

1. P0 Response-, Error- und Validation-Semantik.
2. P1 Route Actions.
3. P2 Progressive Forms.
4. P3 Route-Level Middleware.
5. P4 Typed Route Builder.
6. P5 Testing Utilities.
7. P6 E2E-Ausbau.
8. P7 Node Production Deployment.
9. P8 PreactPress-Dokumentation.
10. P9 GitHub Releases.
11. P10 Referenzprojekte.

P0 sollte zuerst umgesetzt werden, weil es die kleinste zentrale Grundlage für Actions, Forms und Middleware ist und gleichzeitig sicherheitsrelevante Defaults schützt.
