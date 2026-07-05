# CLAUDE.md — ChaosLedger Project Memory

> Source of truth for this build is `BUILD.md`. This file is the persistent
> memory / guardrails. If anything here conflicts with `BUILD.md`, `BUILD.md`
> wins and this file must be updated.

## 1. Tech Stack (LOCKED — no substitutions without explicit user approval)
- **Backend:** Django + Django REST Framework (DRF), `django-cors-headers`, `python-dotenv`, `openai` Python SDK
- **Frontend:** React (Vite template) + Tailwind CSS v4 (`@tailwindcss/vite`) + Recharts + axios
- **AI:** ZhipuAI / BigModel **GLM** via OpenAI-compatible SDK.
  - **APPROVED DEVIATION from BUILD.md** (user-approved 2026-07-05): provider
    changed from OpenAI to ZhipuAI GLM because the supplied key is a GLM key.
    `openai` Python SDK is reused (OpenAI-compatible). Only the client ctor
    (`base_url`) and model strings change vs BUILD.md §6. System prompt, JSON
    schema, JSON-stripping, and DB logic are model-agnostic and stay verbatim.
  - Text path: `glm-4-flash`. Vision path: `glm-4v`.
  - `base_url="https://open.bigmodel.cn/api/paas/v4"`.
  - **ACTUAL available models on this key** (probed 2026-07-05 via /v4/models):
    `glm-4.5`, `glm-4.5-air`, `glm-4.6`, `glm-4.7`, `glm-5`, `glm-5-turbo`,
    `glm-5.1`, `glm-5.2`. The legacy names `glm-4-flash` / `glm-4v` are NOT
    available (API error 1211 "模型不存在").
  - **Updated model choices (probed, not guessed):**
    - Text path: `glm-4.5-air` (fast/cheap 4.x — analog to "flash")
    - Vision path: TBD in Phase C — must probe for an image-capable model.
  - Both `paas/v4` and `coding/paas/v4` base URLs return the same model list;
    using `paas/v4`.
- **DB:** SQLite (Django default)
- **Runtime (this machine):** Python 3.11.1, Node v26.1.0, npm 11.13.0, Git Bash on Windows

## 2. Explicit Non-Goals (DO NOT BUILD)
- NO user authentication / login / sessions
- NO multi-tenancy
- NO payment gateway integration
- NO dark mode
- NO complex settings pages
- NO voice input (SECONDARY in BUILD.md §8 — only if user explicitly asks)
- NO deployment automation (local run is the demo plan, BUILD.md §11 Plan A)
- If a feature does not directly serve the 30-second demo, do not build it.

## 3. Scope Discipline (rule)
**Keep every solution minimal — no extra abstractions, no unrequested
flexibility, no speculative features.** If tempted to add anything not in
`BUILD.md`, STOP and ask the user first. Cutting scope beats polishing scope.

## 4. Error-Handling Discipline (every phase)
Explicitly handle and TEST each of these, not just the happy path:
- Empty input → clean 400 with message
- Malformed AI JSON output → clean 500 with message (never raw stack trace)
- OpenAI API timeout / rate-limit / auth error → clean 503 with message
- Never let an unhandled exception reach the frontend as a raw stack trace.

## 5. Build Order — Checkpointed Phases (BUILD.md §4 → §11)
- **Phase A (Hrs 0–6):** §4 env setup → §5 schema+migration → §6 `POST /api/parse/` text path.
  - Evidence: raw POST → correct JSON + a row in SQLite.
- **Phase B (Hrs 6–10):** §7 frontend scaffold (UploadPanel, Dashboard, TransactionsTable).
  - Evidence: typed sample text updates graph + table live.
- **Phase C (Hrs 10–14):** §8 image parsing path ONLY (voice skipped unless asked).
  - Evidence: receipt image → structured JSON + dashboard update.
- **Phase D (Hrs 14–16):** §9 seed script → §10 Testing Checklist item-by-item → §11 Plan A local run.
  - Evidence: pass/fail per checklist item + clean local run.

**STOP and show real evidence (command + real output) after each phase before
moving on. No "it works" claims.**

## 6. Cut Order (if behind schedule — cut from the TOP first)
Per `BUILD.md` "If You're Behind Schedule":
1. CUT IMMEDIATELY — Voice input logic. (Already non-goal.)
2. CUT AT HOUR 10 — Image parsing. Hide image button with CSS if needed.
3. CUT AT HOUR 12 — Recharts formatting → fallback to plain "Total Revenue: ₹X".
4. CUT AT HOUR 14 — Demo data seeding → manually type 3 entries instead.
5. **NEVER CUT** — `POST /api/parse/` text endpoint + DB save. That IS the product.

## 7. AI JSON Schema (must be enforced by system prompt)
```json
{
  "transactions": [{"item": "string", "qty": number, "price": number, "category": "string"}],
  "total": number,
  "payment_method": "cash" | "upi" | "card" | "unknown"
}
```
Garbled/empty input → `{"transactions": [], "total": 0, "payment_method": "unknown"}`.
No markdown fences, no commentary, no extra keys. (See `BUILD.md` §6 SYSTEM_PROMPT.)

## 8. Endpoints
- `POST /api/parse/` — `{ text }` OR multipart `image`. Returns serialized created transactions (201).
- `GET  /api/transactions/` — all records, newest first.

## 9. Known Risks / Watch-items
- **OpenAI API key** must be supplied by the user and placed in `backend/.env` (gitignored). Without it Phase A cannot be evidenced end-to-end.
- **Newer dependency versions** than when BUILD.md was written (Tailwind v4, React 19 via Vite template, `openai` SDK v1.x) — verify imports match BUILD.md snippets; adjust only if a snippet breaks.
- **Windows + Git Bash:** use `venv/Scripts/activate` not `venv/bin/activate`.
- **CORS:** `CORS_ALLOW_ALL_ORIGINS = True` (fine for local demo only).
