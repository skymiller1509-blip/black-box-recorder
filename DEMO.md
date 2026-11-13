# Demo script - about 2 minutes

Sample orders (fake, for demo only):

1. Order #1042, Ada, 28 days old, $120, damaged on arrival, 0 prior refunds. Expected: approve $120.
2. Order #1043, Bright Ltd, 45 days old, $80, changed mind, 0 prior refunds. Expected: deny.
3. Order #1044, Chidi, 12 days old, $500, changed mind, 1 prior refund. Expected: partial $250.
4. Order #1045, Ada, 9 days old, $60, damaged on arrival, 3 prior refunds. Expected: escalate.

The loud moment (first 20 seconds):

1. (5s) "AI agents decide refunds. Nobody can see why. This records every one."
2. (10s) Run order #1042. The decision lands on the timeline: APPROVE $120.
3. (15s) Drag the age slider from 28 to 31 days and hit Re-run this decision. The banner flips: APPROVE $120 became DENY $0.
4. (30s) Read the new reasons out loud, then the steps. The old decision is still on the record, right beside the new one.
5. (20s) "Every decision is logged with its inputs. Change one input and SERV Reasoning re-runs it. That is audit software."
6. (20s) "Sample data only. The steps are written out by the model, not read from inside SERV. Nothing is stored on the server."

Record while SERV credits last. If the key runs out mid-demo, the error message and the recorded run still show the flow.
