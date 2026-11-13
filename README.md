# Black Box Recorder

One flow: run a refunds agent on a sample order, every input and decision is logged to a timeline. Click a bad call, change one input, and SERV Reasoning re-runs the decision to show how it would have changed.

Built for teams who need to audit what their AI agents decided, and why.

## How it works

- The page is a plain static site (`index.html` + `app.js`).
- The browser never sees the API key. The server (`server.js`, zero dependencies) sends each refund request to SERV Reasoning at `https://inference-api.openserv.ai/v1/chat/completions` (OpenAI-compatible chat completions, model `claude-haiku-4.5` by default, key from `SERV_API_KEY`).
- The agent decides by a fixed refund policy written in the system prompt: 3 or more prior refunds escalates, over 30 days old denies, damaged or defective within 30 days approves in full, changed mind within 30 days approves 50 percent, anything else escalates.
- SERV Reasoning is the decider: it applies the policy step by step and answers as JSON with the decision, the amount, the reasons, and the steps. The steps are shown on screen, so any decision can be audited instead of trusted blind.
- The recorder is the timeline. Every decision, original or what-if replay, is logged with its inputs. Click any entry to read it.
- The what-if is a fresh SERV call with one changed input. The old decision stays on the record and the new one sits beside it, with a banner when the decision changed.
- Model choice, checked live 13 Nov 2026: the SERV catalog no longer lists qwen or deepseek models, and `qwen3.6-flash` and `deepseek-v4-flash` both return "No pricing configured for model". The live catalog has 38 models (Claude, Gemini, GPT, SERV's own). `claude-haiku-4.5` gave the fullest answers in the live tests. Change it with `SERV_MODEL` if needed. Models answer in their own JSON shapes, so `server.js` reshapes any answer into the flat fields the page renders; nothing is invented, values only move.
- Honest limits (v1): the recorder logs what the agent was given and what it decided. The reasoning steps are written out by the model itself, not read from inside SERV Reasoning. A what-if is a fresh SERV call with changed inputs, not a rewind of the original run. The agent decides sample orders only. It is general information only, not legal advice. Pasted data is sent to the SERV Reasoning API for review only. It is not stored by the app. The API key stays on the server and never reaches the browser.

## Run it

```bash
cp .env.example .env   # then put your key in .env, or export SERV_API_KEY
SERV_API_KEY=your_key_here node server.js
# open http://localhost:4185
```

No build step, no dependencies, no database.

## Track

Open Track. Any domain, any stack, built on SERV Reasoning.

## Submission checklist

- [x] OpenServ account + SERV_API_KEY (console.openserv.ai; account created 13 Nov 2026 with eddiebrit4@gmail.com; key stored in the secure connector, never in chat; live decision verified 13 Nov 2026)
- [ ] Public GitHub repo (Eddie creates it on his phone)
- [ ] Demo link or video (script in DEMO.md)
- [ ] Short write-up: what it does, how it uses SERV Reasoning, track = Open
- [ ] X post about the project by 15 Nov 23:59 UTC, link in the submission form
- [ ] Submit before 15 Nov 23:59 UTC (16 Nov 00:59 WAT)

## Revenue story

Teams that run AI agents pay a subscription to record, audit, and replay every decision, so one bad refund cannot hide. That is the pitch, not a proven price. No payment code is in v1.
