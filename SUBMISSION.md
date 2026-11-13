# Black Box Recorder - submission draft (prepared 2026-11-13, not yet submitted)

Status: scaffold built and verified 2026-11-13. Page loads (HTTP 200); live
decision + what-if replay verified with SERV Reasoning the same morning.
Replaces Private Paralegal as the OpenServ entry (Paralegal stays published
as a backup at https://github.com/skymiller1509-blip/private-paralegal).

## Eddie's steps (one at a time)
1. Create the public GitHub repo `black-box-recorder` on his phone, add it to
   the `mabel` token's repository access, tell Mabel when done.
2. Record the ~2-minute demo video following DEMO.md.
3. Post about the project on X, send Mabel the post link.
4. Submit with a full read-back before 15 Nov 23:59 UTC = 16 Nov 00:59 WAT.

## Track
Open Track.

## Short write-up (for the submission form)
Black Box Recorder is a flight recorder for AI agents. A refunds agent
decides sample orders through SERV Reasoning, and every input and decision
is logged to a timeline with its reasons and steps, so any call can be
audited instead of trusted blind. After a bad call, change one input, for
example the order age, and SERV Reasoning re-runs the decision to show how
it would have changed, with the old decision still on the record beside the
new one. It returns plain-words decisions, not legal advice. Data is sent to
the SERV Reasoning API for the decision only and is not stored by the app;
the API key stays on the server and never reaches the browser. Revenue:
teams that run AI agents pay a subscription to record, audit, and replay
every decision, so one bad refund cannot hide.

## X post draft (needs Eddie's post + link back)
"AI agents decide refunds and nobody can see why. I built Black Box
Recorder: every decision is logged, and one changed input re-runs it live
through SERV Reasoning. Built for the OpenServ Hackathon. #OpenServ"

## Demo sample orders (fake, from DEMO.md)
Order #1042, Ada, 28 days old, $120, damaged on arrival, 0 prior refunds.
Expected: approve $120. What-if: 31 days old, expected: deny $0.
