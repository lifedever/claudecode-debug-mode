# Claude Code Debug Mode

> ## ⚠️ This repository has moved
>
> **`debug-mode` is now bundled into [`lifedever/skills-plugin`](https://github.com/lifedever/skills-plugin)** along with the rest of my Claude Code skills, so it can be installed as a single plugin and auto-update via the marketplace.
>
> ### New installation
>
> ```
> /plugin marketplace add lifedever/skills-plugin
> /plugin install lifedever
> ```
>
> Then invoke as `/lifedever:debug-mode` in Claude Code.
>
> ### If you previously cloned this repo into `~/.claude/skills/`
>
> Remove the old copy first to avoid duplicates:
>
> ```bash
> rm -rf ~/.claude/skills/debug-mode
> ```
>
> Then install the plugin (commands above).
>
> This repository is no longer maintained. All future updates ship via `skills-plugin`.

---

Runtime debugging skill for Claude Code — inspired by [Cursor's Debug Mode](https://cursor.com/docs/agent/debug-mode).

Instead of guessing at bugs, this skill instruments your code with log probes, collects runtime data, and uses that evidence to locate and fix issues.

## Features

- **Multi-language support** — JS/TS, Python, Swift, Go, Kotlin/Java, Shell
- **Checkpoint-enforced workflow** — 7 mandatory checkpoints ensure the full debug loop is followed
- **Safe probe blocks** — `PROBE [N]` / `PROBE END [N]` markers for safe block-level cleanup
- **Structured logs** — Run separators (`RUN #1`, `RUN #2`, `VERIFY`) for clear before/after comparison
- **User triage** — Asks targeted questions to gather context before diving in
- **Multiple reproduction** — Supports multiple runs to catch intermittent/race condition bugs

## How It Works

```
Step 0: Triage      — Gather context from user (expected vs actual, repro steps, error messages)
Step 1: Hypothesize — Read code, form hypotheses, plan probe locations
Step 2: Initialize  — Create .claude-debug/ directory and log collector
Step 3: Instrument  — Insert log probes into source files (with START/END block markers)
Step 4: Reproduce   — Run code, collect runtime logs (supports multiple runs)
Step 5: Analyze     — Read logs, identify root cause with evidence
Step 6: Fix & Verify — Apply fix, re-run with probes to confirm (VERIFY run)
Step 7: Cleanup     — Remove all probes and .claude-debug/ directory
```

## Usage

In Claude Code (after installing via `skills-plugin` — see top of this file):

```
/lifedever:debug-mode <describe your bug>
```

Examples:

- `/lifedever:debug-mode the checkout sometimes fails with "insufficient stock" even though the UI shows items in stock`
- `/lifedever:debug-mode race condition in the order processing — two concurrent requests both succeed when only one should`
- `/lifedever:debug-mode the API response is sometimes empty but only under load`

## Probe Format

Probes are wrapped in block markers for safe cleanup:

```javascript
// 🔍 DEBUG PROBE [1] checkout-cache-check
require('fs').appendFileSync('.claude-debug/debug.log', `[${new Date().toISOString()}] [js] app.js:22 | checkout-cache-check | sku=${sku}, available=${available}\n`);
// 🔍 DEBUG PROBE END [1]
```

## Log Format

```
========== RUN #1 | 2026-04-03T15:10:00+08:00 ==========
[2026-04-03T15:10:00.123Z] [js] app.js:22 | cache-hit | sku=SKU-003, cached=1, actual=0
[2026-04-03T15:10:00.234Z] [js] app.js:45 | reserve-success | sku=SKU-003, newReserved=1

========== VERIFY | 2026-04-03T15:12:00+08:00 ==========
[2026-04-03T15:12:00.123Z] [js] app.js:22 | cache-hit | sku=SKU-003, cached=0, actual=0
[2026-04-03T15:12:00.234Z] [js] app.js:45 | reserve-success | sku=SKU-003, newReserved=1
```

## License

MIT
