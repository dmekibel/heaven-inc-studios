# /brain — Self-Directed Metacognitive Engine

---

## What This Is

A single command that makes the system THINK. Not about what the user asked — about what the PROJECT NEEDS. The brain assesses the current state, decides what function to run, runs it, and reports what it found.

The user says `/brain`. The system does the rest.

---

## How It Works

### Step 1: Assess (Always runs first)

Read the current state:
- `meta/working-memory.md` — what's the system been thinking?
- `meta/evolve-log.md` — what has the system learned about itself?
- `meta/session-log.md` — what happened recently?
- `game/DESIGN-BIBLE.md` — current game design state (if exists)
- Scan `lore/` — what's populated, what's empty?
- Scan `game/` — what's been built, what's missing?

### Step 2: Decide (Brain chooses its own mode)

Based on assessment, score each function 0-10 on URGENCY:

| Function | Trigger Conditions (High Urgency) |
|----------|----------------------------------|
| **DREAM** | Lore is rich but no game ideas exist yet. Design is stale. No new connections in 2+ sessions. Creative block. |
| **EVOLVE** | Something feels wrong. Mechanics drift from lore. Tone is off. Technical debt growing. Process isn't working. |
| **CONNECT** | New lore was recently ingested. Multiple unlinked sources exist. Design decisions lack lore justification. |
| **STATUS** | 3+ sessions since last status. User seems unclear on state. Major milestone reached or missed. |

Run the highest-urgency function. If multiple tie, run multiple. If all score low (project is healthy), say so and suggest what the user could do next.

### Step 3: Execute

#### DREAM Mode
Generate 3-5 game ideas that COULD NOT exist in any other IP. Each idea must:
- Name the lore source it comes from
- Describe the mechanic or experience
- Explain why it's native to Heaven Inc.
- Rate its feasibility (1-5) and excitement (1-5)

Write discoveries to `meta/working-memory.md`.

#### EVOLVE Mode
Audit across 5 lenses:
1. **Lore Lens** — What's thin? What's contradictory? What's unexplored?
2. **Design Lens** — Do mechanics serve narrative? Is player experience coherent?
3. **Technical Lens** — Is code maintainable? Architecture risks?
4. **Vision Lens** — Is the game becoming what it should be? Are we drifting?
5. **Gap Lens** — What's missing that would make this 10x better?

Propose ranked improvements. Flag the #1 most important thing.
Write findings to `meta/evolve-log.md`.

#### CONNECT Mode
Search for patterns across ALL ingested lore:
- Thematic echoes between different storylines
- Character parallels → game mechanics
- World rules that interact unexpectedly
- Aesthetic motifs → player experience

For each connection found:
- Name the two (or more) things being connected
- Explain the connection
- State the game design implication

Write connections to `lore/connections/`.

#### STATUS Mode
Output a snapshot:
```
LORE:    [coverage bar] X/Y sources ingested, Z structured
DESIGN:  [state] — what's decided, what's open
BUILD:   [state] — what exists, what works, what's broken
BRAIN:   [health] — last dream, last evolve, last connect
NEXT:    [recommendation] — what should happen next
```

### Step 4: Report

Tell the user (concisely):
1. What mode the brain chose and WHY
2. What it found
3. What it recommends
4. Any questions for the user (max 1-2)

### Step 5: Save

Update `meta/working-memory.md` with new thoughts.
Update `meta/session-log.md` with what happened.
Update `meta/evolve-log.md` if evolve ran.

---

## Rules

- The brain NEVER asks the user which mode to run. It decides.
- The brain NEVER produces generic game design advice. Everything must be Heaven Inc.-specific.
- The brain admits when it doesn't know something. "I need more lore on X before I can think about Y."
- The brain challenges bad ideas — including its own from previous sessions.
- The brain is concise. No filler. Findings first, reasoning second.
- The brain keeps a running count of how many times each function has run (tracked in working-memory).

---

## Brain Run Counter

Track in working-memory.md:
```
DREAM runs:   0
EVOLVE runs:  0
CONNECT runs: 0
STATUS runs:  0
Total /brain: 0
```
