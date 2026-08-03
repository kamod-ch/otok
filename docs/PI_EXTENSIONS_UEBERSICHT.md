# Pi Extensions – Übersicht, Aufruf und Zweck

Diese Datei beschreibt die Beispiel-Extensions von pi aus `examples/extensions/`, was sie machen und wie man sie lädt bzw. aufruft.

## Grundsätzlich: Extensions laden

### Einmalig testen

```bash
pi -e /pfad/zur/extension.ts
# oder
pi --extension /pfad/zur/extension.ts
```

Beispiel:

```bash
pi -e examples/extensions/permission-gate.ts
```

### Dauerhaft global installieren

```bash
mkdir -p ~/.pi/agent/extensions
cp examples/extensions/permission-gate.ts ~/.pi/agent/extensions/
pi
```

### Projekt-lokal installieren

```bash
mkdir -p .pi/extensions
cp examples/extensions/permission-gate.ts .pi/extensions/
pi
```

Nach Änderungen neu laden:

```text
/reload
```

> Wichtig: Extensions laufen mit vollen Systemrechten. Nur vertrauenswürdige Extensions laden.

---

## Was Extensions können

Extensions können z. B.:

- eigene Slash-Commands registrieren, z. B. `/todos`
- eigene Tools für das Modell registrieren, z. B. `todo`
- Tool-Aufrufe blockieren oder verändern
- User-Input transformieren
- UI anpassen: Footer, Header, Widgets, Overlays, Editor
- eigene Provider/Modelle registrieren
- Session-Daten speichern
- Git-, Sandbox- oder SSH-Integration hinzufügen
- Spiele in der TUI anzeigen

---

# Beispiel-Extensions

## Sicherheit & Lifecycle

### `permission-gate.ts`

Fragt nach Bestätigung, bevor gefährliche Bash-Befehle ausgeführt werden, z. B. `rm -rf`, `sudo`, `chmod 777`.

```bash
pi -e examples/extensions/permission-gate.ts
```

Läuft automatisch bei Bash-Tool-Aufrufen.

### `project-trust.ts`

Demonstriert den `project_trust` Hook. Eine globale oder per CLI geladene Extension kann entscheiden, ob ein Projekt vertrauenswürdig ist.

```bash
pi -e examples/extensions/project-trust.ts
```

### `protected-paths.ts`

Blockiert Schreibzugriffe auf geschützte Pfade wie `.env`, `.git/`, `node_modules/`.

```bash
pi -e examples/extensions/protected-paths.ts
```

### `confirm-destructive.ts`

Fragt nach, bevor destruktive Session-Aktionen ausgeführt werden.

```bash
pi -e examples/extensions/confirm-destructive.ts
```

Reagiert automatisch auf `/new`, `/resume`, `/fork`, `/clone`.

### `dirty-repo-guard.ts`

Verhindert Session-Wechsel/Forks, wenn das Git-Repo uncommitted Änderungen hat.

```bash
pi -e examples/extensions/dirty-repo-guard.ts
```

### `sandbox/`

Führt Tools in einer OS-Sandbox aus.

```bash
pi -e examples/extensions/sandbox
```

Deaktivieren:

```bash
pi -e examples/extensions/sandbox --no-sandbox
```

### `gondolin/`

Leitet Built-in-Tools und `!` Commands in eine Gondolin Micro-VM um.

```bash
pi -e examples/extensions/gondolin
```

Command:

```text
/gondolin
```

---

## Custom Tools

### `hello.ts`

Minimalbeispiel für ein eigenes Tool.

```bash
pi -e examples/extensions/hello.ts
```

### `todo.ts`

Todo-Tool plus `/todos` Command mit Session-Persistenz.

```bash
pi -e examples/extensions/todo.ts
```

Command:

```text
/todos
```

Tool:

```text
todo
```

### `question.ts`

Tool, mit dem das Modell dem Nutzer eine Auswahlfrage stellen kann.

```bash
pi -e examples/extensions/question.ts
```

Tool:

```text
question
```

### `questionnaire.ts`

Mehrstufiger Fragebogen mit eigener UI und Tab-Navigation.

```bash
pi -e examples/extensions/questionnaire.ts
```

Tool:

```text
questionnaire
```

### `tool-override.ts`

Überschreibt das Built-in-Tool `read`, z. B. für Logging/Zugriffskontrolle.

```bash
pi -e examples/extensions/tool-override.ts
```

Command:

```text
/read-log
```

### `dynamic-tools.ts`

Registriert Tools dynamisch nach Session-Start oder per Command.

```bash
pi -e examples/extensions/dynamic-tools.ts
```

Command:

```text
/add-echo-tool
```

### `kimi-deferred-tools.ts`

Deferred Tool Loading: Tools werden erst gesucht/aktiviert, wenn sie gebraucht werden.

```bash
pi -e examples/extensions/kimi-deferred-tools.ts
```

Tools:

```text
tool_search
Calculator
```

### `structured-output.ts`

Finales Structured-Output-Tool. Kann Agent-Lauf nach Tool-Aufruf beenden.

```bash
pi -e examples/extensions/structured-output.ts
```

### `truncated-tool.ts`

`rg` Tool mit Output-Truncation auf 50KB/2000 Zeilen.

```bash
pi -e examples/extensions/truncated-tool.ts
```

Tool:

```text
rg
```

### `ssh.ts`

Delegiert Tools an eine Remote-Maschine via SSH.

```bash
pi -e examples/extensions/ssh.ts --ssh user@host
```

### `subagent/`

Registriert ein `subagent` Tool für spezialisierte Sub-Agenten.

```bash
pi -e examples/extensions/subagent
```

Tool:

```text
subagent
```

---

## Commands & UI

### `preset.ts`

Presets für Modell, Thinking-Level, Tools und Instruktionen.

```bash
pi -e examples/extensions/preset.ts
```

Command:

```text
/preset
```

Flag:

```bash
pi -e examples/extensions/preset.ts --preset NAME
```

### `plan-mode/`

Claude-Code-artiger Plan-Modus für read-only Exploration und Schrittplanung.

```bash
pi -e examples/extensions/plan-mode
```

Commands:

```text
/plan
/todos
```

Flag:

```bash
pi -e examples/extensions/plan-mode --plan
```

### `tools.ts`

Interaktive UI zum Aktivieren/Deaktivieren von Tools.

```bash
pi -e examples/extensions/tools.ts
```

Command:

```text
/tools
```

### `handoff.ts`

Überträgt Kontext in eine neue fokussierte Session.

```bash
pi -e examples/extensions/handoff.ts
```

Command:

```text
/handoff <ziel>
```

### `qna.ts`

Extrahiert Fragen aus der letzten Antwort und setzt sie in den Editor.

```bash
pi -e examples/extensions/qna.ts
```

Command:

```text
/qna
```

### `status-line.ts`

Zeigt Turn-Fortschritt im Footer an.

```bash
pi -e examples/extensions/status-line.ts
```

### `github-issue-autocomplete.ts`

Fügt `#1234` Issue-Autocomplete hinzu. Benötigt GitHub CLI `gh`.

```bash
pi -e examples/extensions/github-issue-autocomplete.ts
```

Danach im Editor `#` tippen.

### `widget-placement.ts`

Demonstriert Widgets oberhalb/unterhalb des Editors.

```bash
pi -e examples/extensions/widget-placement.ts
```

### `hidden-thinking-label.ts`

Ändert das Label für eingeklappte Thinking-Ausgabe.

```bash
pi -e examples/extensions/hidden-thinking-label.ts
```

Command:

```text
/thinking-label
```

### `working-indicator.ts`

Ändert den Streaming-Indikator.

```bash
pi -e examples/extensions/working-indicator.ts
```

Command:

```text
/working-indicator
```

### `model-status.ts`

Zeigt Modellwechsel im Statusbereich an.

```bash
pi -e examples/extensions/model-status.ts
```

Reagiert automatisch auf `/model` oder `Ctrl+P`.

### `snake.ts`

Snake-Spiel in der TUI.

```bash
pi -e examples/extensions/snake.ts
```

Command:

```text
/snake
```

### `tic-tac-toe.ts`

Tic-Tac-Toe gegen den Agenten.

```bash
pi -e examples/extensions/tic-tac-toe.ts
```

Command:

```text
/tic-tac-toe
```

Tools:

```text
tic_tac_toe
tic_tac_toe_see_board
```

### `space-invaders.ts`

Space Invaders in der TUI.

```bash
pi -e examples/extensions/space-invaders.ts
```

Command:

```text
/invaders
```

### `send-user-message.ts`

Zeigt, wie Extensions User-Messages injizieren.

```bash
pi -e examples/extensions/send-user-message.ts
```

Commands:

```text
/ask
/steer
/followup
/askwith
```

### `timed-confirm.ts`

Dialoge mit Timeout.

```bash
pi -e examples/extensions/timed-confirm.ts
```

Commands:

```text
/timed
/timed-select
/timed-signal
```

### `rpc-demo.ts`

Testet Extension-UI im RPC-Modus.

```bash
pi --mode rpc -e examples/extensions/rpc-demo.ts
```

Commands:

```text
/rpc-input
/rpc-editor
/rpc-prefill
```

### `modal-editor.ts`

Ersetzt den Editor durch einen Vim-artigen Modal-Editor.

```bash
pi -e examples/extensions/modal-editor.ts
```

### `rainbow-editor.ts`

Animierter Rainbow-Editor.

```bash
pi -e examples/extensions/rainbow-editor.ts
```

### `notify.ts`

Sendet Desktop-/Terminal-Notifications, wenn der Agent fertig ist.

```bash
pi -e examples/extensions/notify.ts
```

### `titlebar-spinner.ts`

Zeigt Spinner in der Terminal-Titelleiste während der Agent arbeitet.

```bash
pi -e examples/extensions/titlebar-spinner.ts
```

### `summarize.ts`

Fasst die Conversation zusammen und zeigt sie in UI.

```bash
pi -e examples/extensions/summarize.ts
```

Command:

```text
/summarize
```

### `custom-footer.ts`

Ersetzt den Footer durch eigenen Footer.

```bash
pi -e examples/extensions/custom-footer.ts
```

Command:

```text
/footer
```

### `custom-header.ts`

Ersetzt den Header.

```bash
pi -e examples/extensions/custom-header.ts
```

Command:

```text
/builtin-header
```

### `overlay-test.ts`

Testet Overlay-Komponenten.

```bash
pi -e examples/extensions/overlay-test.ts
```

Command:

```text
/overlay-test
```

### `overlay-qa-tests.ts`

Viele Overlay-Tests.

```bash
pi -e examples/extensions/overlay-qa-tests.ts
```

Commands:

```text
/overlay-animation
/overlay-anchors
/overlay-margins
/overlay-stack
/overlay-overflow
/overlay-edge
/overlay-percent
/overlay-maxheight
/overlay-sidepanel
/overlay-toggle
/overlay-passive
/overlay-focus
/overlay-streaming
```

### `doom-overlay/`

DOOM als Overlay.

```bash
pi -e examples/extensions/doom-overlay
```

Command:

```text
/doom-overlay
```

### `shutdown-command.ts`

Fügt Quit-/Exit-Funktionen hinzu.

```bash
pi -e examples/extensions/shutdown-command.ts
```

Command:

```text
/quit
```

Tools:

```text
finish_and_exit
deploy_and_exit
```

### `reload-runtime.ts`

Sicheres Reload-Beispiel.

```bash
pi -e examples/extensions/reload-runtime.ts
```

Command:

```text
/reload-runtime
```

Tool:

```text
reload_runtime
```

### `interactive-shell.ts`

Erlaubt interaktive Terminal-Programme wie `vim`, `htop` via User-Bash-Hook.

```bash
pi -e examples/extensions/interactive-shell.ts
```

### `inline-bash.ts`

Erweitert Prompts mit Inline-Bash-Ausdrücken.

```bash
pi -e examples/extensions/inline-bash.ts
```

Beispiel:

```text
Bitte analysiere !{git status}
```

### `input-transform.ts`

Transformiert User-Input vor Skill-/Template-Expansion.

```bash
pi -e examples/extensions/input-transform.ts
```

### `input-transform-streaming.ts`

Wie `input-transform.ts`, aber mit Streaming-Verhalten.

```bash
pi -e examples/extensions/input-transform-streaming.ts
```

---

## Git-Integration

### `git-checkpoint.ts`

Erstellt Git-Stash-Checkpoints pro Turn.

```bash
pi -e examples/extensions/git-checkpoint.ts
```

### `auto-commit-on-exit.ts`

Commitet automatisch beim Beenden.

```bash
pi -e examples/extensions/auto-commit-on-exit.ts
```

### `git-merge-and-resolve.ts`

Kann fetch/merge machen und bei Konflikten Folgeaufgaben injizieren.

```bash
pi -e examples/extensions/git-merge-and-resolve.ts
```

---

## System Prompt & Compaction

### `pirate.ts`

Modifiziert den System Prompt, sodass der Agent piratenartig antwortet.

```bash
pi -e examples/extensions/pirate.ts
```

Command:

```text
/pirate
```

### `claude-rules.ts`

Liest `.claude/rules/` und fügt Regeln dem System Prompt hinzu.

```bash
pi -e examples/extensions/claude-rules.ts
```

### `custom-compaction.ts`

Ersetzt die normale Compaction durch eigene Zusammenfassung.

```bash
pi -e examples/extensions/custom-compaction.ts
```

Wird bei `/compact` oder Auto-Compaction aktiv.

### `trigger-compact.ts`

Triggert Compaction manuell oder bei großem Kontext.

```bash
pi -e examples/extensions/trigger-compact.ts
```

Command:

```text
/trigger-compact
```

### `prompt-customizer.ts`

Fügt kontextabhängige Tool-Hinweise in den System Prompt ein.

```bash
pi -e examples/extensions/prompt-customizer.ts
```

### `system-prompt-header.ts`

Zeigt Informationen über den System Prompt an.

```bash
pi -e examples/extensions/system-prompt-header.ts
```

---

## Ressourcen

### `dynamic-resources/`

Lädt Skills, Prompt-Templates und Themes dynamisch.

```bash
pi -e examples/extensions/dynamic-resources
```

---

## Messages & Rendering

### `message-renderer.ts`

Rendert eigene Custom Messages farbig und ausklappbar.

```bash
pi -e examples/extensions/message-renderer.ts
```

Command:

```text
/status
```

### `entry-renderer.ts`

Rendert TUI-only Session Entries, die nicht in den LLM-Kontext gehen.

```bash
pi -e examples/extensions/entry-renderer.ts
```

Command:

```text
/status-card
```

### `event-bus.ts`

Kommunikation zwischen Extensions über `pi.events`.

```bash
pi -e examples/extensions/event-bus.ts
```

Command:

```text
/emit
```

---

## Session Metadata

### `session-name.ts`

Setzt oder liest Session-Namen.

```bash
pi -e examples/extensions/session-name.ts
```

Command:

```text
/session-name
```

### `bookmark.ts`

Setzt Labels/Bookmarks für `/tree`.

```bash
pi -e examples/extensions/bookmark.ts
```

Commands:

```text
/bookmark
/unbookmark
```

---

## Custom Provider

### `custom-provider-anthropic/`

Registriert einen Anthropic-kompatiblen Provider mit OAuth und Custom Streaming.

```bash
pi -e examples/extensions/custom-provider-anthropic
```

### `custom-provider-gitlab-duo/`

Registriert GitLab Duo als Provider.

```bash
pi -e examples/extensions/custom-provider-gitlab-duo
```

---

## Externe Dependencies

### `with-deps/`

Extension mit eigener `package.json` und npm Dependencies.

```bash
cd examples/extensions/with-deps
npm install
pi -e .
```

Tool:

```text
parse_duration
```

### `file-trigger.ts`

Überwacht eine Trigger-Datei und injiziert deren Inhalt in die Konversation.

```bash
pi -e examples/extensions/file-trigger.ts
```

---

## Built-in Tool Rendering / Overrides

### `built-in-tool-renderer.ts`

Ersetzt nur die Darstellung von Built-in-Tools, nicht deren Verhalten.

```bash
pi -e examples/extensions/built-in-tool-renderer.ts
```

Betroffene Tools:

```text
read
bash
edit
write
```

### `minimal-mode.ts`

Zeigt Tools minimaler an.

```bash
pi -e examples/extensions/minimal-mode.ts
```

Betroffene Tools:

```text
read
bash
write
edit
find
grep
ls
```

### `bash-spawn-hook.ts`

Passt Bash-Commands, cwd oder env vor Ausführung an.

```bash
pi -e examples/extensions/bash-spawn-hook.ts
```

---

# Schnellreferenz: Command/Tool-Aufrufe

| Extension | Command(s) | Tool(s) / Flag(s) |
|---|---|---|
| `bookmark.ts` | `/bookmark`, `/unbookmark` | - |
| `custom-footer.ts` | `/footer` | - |
| `custom-header.ts` | `/builtin-header` | - |
| `doom-overlay/` | `/doom-overlay` | - |
| `dynamic-tools.ts` | `/add-echo-tool` | - |
| `entry-renderer.ts` | `/status-card` | - |
| `event-bus.ts` | `/emit` | - |
| `gondolin/` | `/gondolin` | - |
| `handoff.ts` | `/handoff <ziel>` | - |
| `hidden-thinking-label.ts` | `/thinking-label` | - |
| `message-renderer.ts` | `/status` | - |
| `overlay-test.ts` | `/overlay-test` | - |
| `pirate.ts` | `/pirate` | - |
| `plan-mode/` | `/plan`, `/todos` | `--plan` |
| `preset.ts` | `/preset` | `--preset NAME` |
| `qna.ts` | `/qna` | - |
| `question.ts` | - | `question` |
| `questionnaire.ts` | - | `questionnaire` |
| `reload-runtime.ts` | `/reload-runtime` | `reload_runtime` |
| `rpc-demo.ts` | `/rpc-input`, `/rpc-editor`, `/rpc-prefill` | RPC mode |
| `send-user-message.ts` | `/ask`, `/steer`, `/followup`, `/askwith` | - |
| `session-name.ts` | `/session-name` | - |
| `shutdown-command.ts` | `/quit` | `finish_and_exit`, `deploy_and_exit` |
| `snake.ts` | `/snake` | - |
| `space-invaders.ts` | `/invaders` | - |
| `ssh.ts` | - | `--ssh user@host` |
| `subagent/` | - | `subagent` |
| `summarize.ts` | `/summarize` | - |
| `tic-tac-toe.ts` | `/tic-tac-toe` | `tic_tac_toe`, `tic_tac_toe_see_board` |
| `timed-confirm.ts` | `/timed`, `/timed-select`, `/timed-signal` | - |
| `todo.ts` | `/todos` | `todo` |
| `tool-override.ts` | `/read-log` | overrides `read` |
| `tools.ts` | `/tools` | - |
| `trigger-compact.ts` | `/trigger-compact` | - |
| `truncated-tool.ts` | - | `rg` |
| `with-deps/` | - | `parse_duration` |
| `working-indicator.ts` | `/working-indicator` | - |
