---
name: debug-mode
description: >
  Runtime debug mode - insert log probes, collect runtime data, locate and fix bugs.
  Best for: reproducible bugs with unclear cause, race conditions, timing issues,
  performance/memory leaks, and regressions.
  Use when user says: "debug-mode", "debug mode", "探针调试", "运行时调试",
  "trace this bug", "找出这个bug", "加日志排查", "插探针",
  or needs to debug runtime issues that static analysis can't solve.
version: 1.0.0
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, Agent
---

# Debug Mode — Runtime Debugging

Locate and fix bugs by inserting log probes, collecting runtime data, and analyzing execution traces. Multi-language support.

## ⛔ MANDATORY RULES — ENFORCED VIA CHECKPOINTS

**This skill uses a checkpoint system. You MUST print each checkpoint marker BEFORE proceeding to the next step. If you skip a checkpoint, the entire debug session is invalid.**

Each step ends with a checkpoint that you must print exactly:

- `✅ CHECKPOINT 1: Probe plan created — N probes planned`
- `✅ CHECKPOINT 2: Log collector started`
- `✅ CHECKPOINT 3: N probes inserted into source files` (you must have used the Edit tool N times)
- `✅ CHECKPOINT 4: Code executed, log file has N entries`
- `✅ CHECKPOINT 5: Root cause identified with log evidence`
- `✅ CHECKPOINT 6: Fix applied and verified with probes`
- `✅ CHECKPOINT 7: All probes removed, cleanup complete`

**HARD RULES:**

1. You CANNOT print CHECKPOINT 5 without first printing CHECKPOINTS 1-4
2. You CANNOT propose a fix without citing specific lines from `.claude-debug/debug.log`
3. You MUST use the Edit tool to physically insert probe code into source files at Step 3 — reading code and proposing probes mentally does not count
4. You MUST use the Bash tool to run `cat .claude-debug/debug.log` at Step 5 — you cannot analyze logs you haven't collected
5. Even if the bug is obvious from reading code, you MUST still instrument, run, and collect. This is non-negotiable. The purpose is runtime verification, not static analysis.

## Core Principles

1. **Understand before instrumenting** — Read code and error messages, identify suspect areas, place probes only on critical paths
2. **Minimal intrusion** — Probes must not alter original logic, only observe and record
3. **Closed loop** — Instrument → Run → Collect → Analyze → Fix → Verify → Clean up

## Workflow

### Step 0: Triage — Gather Context from User

Before reading any code, ask the user targeted questions to collect clues. **Only ask what you don't already know** — skip questions the user has already answered in their initial message.

Questions to consider (pick the relevant ones):

- **What is the expected behavior vs actual behavior?**
- **How do you reproduce it?** (exact steps, commands, or user actions)
- **Is it consistent or intermittent?** (every time, or only sometimes?)
- **When did it start?** (after a specific change, deployment, or dependency update?)
- **Any error messages or stack traces?** (ask user to paste them)
- **What have you already tried?**

If the user's initial description is detailed enough (includes repro steps, error messages, expected vs actual), skip this step and proceed directly to Step 1.

Print: `✅ CHECKPOINT 0: Context gathered`

### Step 1: Understand the Problem & Plan Probes

1. Read relevant code, identify suspect areas
2. Form 2-3 hypotheses
3. For each hypothesis, plan probes: which file, which line, which variables to observe
4. Output the probe plan as a table, then **immediately proceed to Step 2**:

```
📋 Probe Plan:
| # | File:Line | Label | Variables | Hypothesis |
|---|-----------|-------|-----------|------------|
| 1 | app.js:22 | checkout-cache-check | available, sku | Cache returning stale value |
| 2 | app.js:45 | reserve-entry | stock, reserved | Actual stock state at reservation time |
...

⏳ Inserting probes...
```

### Step 2: Start Log Collector

Initialize the debug directory with a structured log system:

```bash
mkdir -p .claude-debug
: > .claude-debug/debug.log
echo "run_count=0" > .claude-debug/state
```

**Writing a run separator** — before each execution, write a run header:

```bash
RUN_NUM=$(($(grep -oP 'run_count=\K\d+' .claude-debug/state) + 1))
echo "run_count=$RUN_NUM" > .claude-debug/state
echo "" >> .claude-debug/debug.log
echo "========== RUN #$RUN_NUM | $(date -Iseconds) ==========" >> .claude-debug/debug.log
```

This ensures multiple runs are clearly separated in the log file.

**Optional: HTTP collector** (for JS/TS/Python projects that benefit from a debug server)

```bash
node "${SKILL_DIR}/scripts/debug-server.js" 3333 &
echo $! > .claude-debug/server.pid
curl -s http://localhost:3333/health
```

Default to file-based logging (more universal).

### Step 3: Insert Probes (MUST use Edit tool)

**You MUST use the Edit tool to physically modify source files.** For each probe in your plan, call the Edit tool once to insert the probe code. Do not just describe what probes you would insert — actually insert them.

Select the probe template matching the project language. **Every probe MUST include**:
- File name and line number
- Label (semantic description of probe location)
- Key variable values
- Timestamp (for file-based logging)

All probes MUST be wrapped in START/END block comments for safe block-level cleanup:

```
// 🔍 DEBUG PROBE [N] label
<probe code - one or more lines>
// 🔍 DEBUG PROBE END [N]
```

Where `[N]` is the probe number from the plan. This ensures cleanup can delete entire blocks without accidentally removing real code.

After inserting all probes, print: `✅ CHECKPOINT 3: N probes inserted into source files`

#### JavaScript / TypeScript

```javascript
// 🔍 DEBUG PROBE [1] funcName-entry
require('fs').appendFileSync('.claude-debug/debug.log', `[${new Date().toISOString()}] [js] file.js:42 | funcName-entry | var1=${JSON.stringify(var1)}, var2=${JSON.stringify(var2)}\n`);
// 🔍 DEBUG PROBE END [1]
```

#### Python

```python
# 🔍 DEBUG PROBE [1] funcName-entry
import datetime; open(".claude-debug/debug.log", "a").write(f"[{datetime.datetime.now().isoformat()}] [python] file.py:42 | funcName-entry | var1={var1}, var2={var2}\n")
# 🔍 DEBUG PROBE END [1]
```

#### Swift

```swift
// 🔍 DEBUG PROBE [1] funcName-entry
if let fh = FileHandle(forWritingAtPath: ".claude-debug/debug.log") {
    fh.seekToEndOfFile()
    fh.write("[\(ISO8601DateFormatter().string(from: Date()))] [swift] file.swift:42 | funcName-entry | val=\(variable)\n".data(using: .utf8)!)
    fh.closeFile()
}
// 🔍 DEBUG PROBE END [1]
```

#### Go

```go
// 🔍 DEBUG PROBE [1] funcName-entry
if f, err := os.OpenFile(".claude-debug/debug.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644); err == nil {
    fmt.Fprintf(f, "[%s] [go] file.go:42 | funcName-entry | var=%v\n", time.Now().Format(time.RFC3339), variable)
    f.Close()
}
// 🔍 DEBUG PROBE END [1]
```

#### Java / Kotlin

```kotlin
// 🔍 DEBUG PROBE [1] funcName-entry
java.io.File(".claude-debug/debug.log").appendText("[${java.time.Instant.now()}] [kotlin] file.kt:42 | funcName-entry | var=$variable\n")
// 🔍 DEBUG PROBE END [1]
```

#### Shell / Bash

```bash
# 🔍 DEBUG PROBE [1] funcName-entry
echo "[$(date -Iseconds)] [bash] script.sh:42 | funcName-entry | var=$variable" >> .claude-debug/debug.log
# 🔍 DEBUG PROBE END [1]
```

### Step 4: Run & Reproduce

**Before each run**, write a run separator to the log:

```bash
RUN_NUM=$(($(grep -oP 'run_count=\K\d+' .claude-debug/state) + 1))
echo "run_count=$RUN_NUM" > .claude-debug/state
echo -e "\n========== RUN #$RUN_NUM | $(date -Iseconds) ==========" >> .claude-debug/debug.log
```

Then run the code:

```bash
<project run command>
```

If the project requires manual interaction (GUI app, browser), tell the user:

> "Probes inserted at:
> - `fileA.xx:line` — observing XXX
> - `fileB.xx:line` — observing YYY
>
> Please reproduce the issue and let me know when done."

**For intermittent bugs (race conditions, timing issues):** run multiple times (2-3 runs) with a separator before each. Compare logs across `RUN #1`, `RUN #2`, etc. to spot inconsistencies.

### Step 5: Analyze Logs

```bash
cat .claude-debug/debug.log
```

Analysis checklist:
- **Ordering**: Is the execution order as expected?
- **Missing entries**: Which probes were NOT triggered (code paths not taken)?
- **Unexpected values**: Are variable values as expected?
- **Duplicates**: Any unexpected repeated executions (loop/reentry issues)?
- **Timing gaps**: Abnormal time intervals between probes (performance/timeout issues)?

### Step 6: Locate & Fix

Based on log analysis:

1. State the root cause clearly, citing specific log entries as evidence (include RUN # and timestamp)
2. Implement the fix
3. **Keep probes in place**, write a new run separator labeled `VERIFY`, re-run to collect "after fix" logs:

```bash
echo -e "\n========== VERIFY | $(date -Iseconds) ==========" >> .claude-debug/debug.log
<project run command>
```

4. Compare "before fix" run(s) with "VERIFY" run — the problematic log entries should now show correct values
5. After verification passes, proceed to cleanup

If analysis is insufficient to locate the issue:
- Add more fine-grained probes (narrow the scope)
- Return to Step 4 and re-run
- Maximum 3 iterations. After 3 rounds, report findings and discuss next steps with the user

### Step 7: Cleanup

**MANDATORY — must not be skipped:**

```bash
# Stop HTTP collector (if started)
if [ -f .claude-debug/server.pid ]; then
  kill $(cat .claude-debug/server.pid) 2>/dev/null
fi

# Delete debug directory
rm -rf .claude-debug/
```

Search for all probe blocks in code:

```bash
grep -rn "🔍 DEBUG PROBE" . --include="*.ts" --include="*.js" --include="*.py" --include="*.swift" --include="*.go" --include="*.kt" --include="*.java" --include="*.sh"
```

For each file, remove entire probe blocks — everything from `🔍 DEBUG PROBE [N]` to `🔍 DEBUG PROBE END [N]` inclusive. Use the Edit tool to delete each block. The START/END markers ensure no real code is accidentally removed.

Verify cleanup is complete:

```bash
grep -rn "DEBUG PROBE" . --include="*.ts" --include="*.js" --include="*.py" --include="*.swift" --include="*.go" --include="*.kt" --include="*.java" --include="*.sh"
```

This must return zero results. **No probe code may remain.**

## Probe Label Conventions

| Pattern | Example | Use For |
|---------|---------|---------|
| `funcName-entry` | `processOrder-entry` | Function entry |
| `funcName-exit` | `processOrder-exit` | Function exit |
| `funcName-error` | `processOrder-error` | Error catch |
| `varName-state` | `cart-state` | State snapshot |
| `condition-branch` | `earlyReturn-branch` | Control flow branch |
| `loop-iter` | `retry-iter` | Loop iteration |
| `async-await` | `fetchData-await` | Async await point |

## Important Notes

- Probe code **must not affect original logic** (all probes wrapped in try-catch or error suppression)
- All probes MUST use `🔍 DEBUG PROBE [N] label` / `🔍 DEBUG PROBE END [N]` block markers — this ensures safe block-level deletion during cleanup
- Log directory is `.claude-debug/`, log file is `.claude-debug/debug.log`, run counter is `.claude-debug/state`
- Each run is separated by `========== RUN #N | timestamp ==========`, verification run is labeled `========== VERIFY | timestamp ==========`
- Add `.claude-debug/` to .gitignore if not already ignored
- For production code, confirm with user before inserting probes
