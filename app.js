// Black Box Recorder - client side.
// One flow: run a refund order -> it is logged -> click it -> change one
// input -> re-run -> old and new decisions sit side by side.
const ORDERS = [
  { id: "#1042", customer: "Ada", ageDays: 28, amount: 120, reason: "damaged on arrival", priorRefunds: 0 },
  { id: "#1043", customer: "Bright Ltd", ageDays: 45, amount: 80, reason: "changed mind", priorRefunds: 0 },
  { id: "#1044", customer: "Chidi", ageDays: 12, amount: 500, reason: "changed mind", priorRefunds: 1 },
  { id: "#1045", customer: "Ada", ageDays: 9, amount: 60, reason: "damaged on arrival", priorRefunds: 3 },
];

const log = [];
let selected = -1;

const $ = (id) => document.getElementById(id);

function esc(s) {
  return String(s ?? "").replace(/</g, "&lt;");
}

function list(items) {
  return "<ul>" + (items || []).map((s) => "<li>" + esc(s) + "</li>").join("") + "</ul>";
}

function decisionCard(entry) {
  const d = entry.decision;
  const o = entry.order;
  return "<div class='card'>" +
    "<span class='badge " + esc(d.decision) + "'>" + esc(d.decision.toUpperCase()) + "</span> " +
    "<strong>$" + esc(d.amount) + "</strong> " +
    "<span class='small'>order " + esc(o.id) + ", " + esc(o.customer) + ", " +
    esc(o.ageDays) + " days old, $" + esc(o.amount) + ", " + esc(o.reason) +
    ", " + esc(o.priorRefunds) + " prior refunds" +
    (entry.whatIf ? ", WHAT-IF replay" : "") + "</span>" +
    "<p><strong>Why:</strong></p>" + list(d.reasons) +
    "<p><strong>Steps:</strong></p>" + list(d.steps) +
    (d.warning ? "<p><strong>Warning:</strong> " + esc(d.warning) + "</p>" : "") +
    "</div>";
}

function renderOrders() {
  $("orders").innerHTML = ORDERS.map((o, i) =>
    "<button class='order-btn' data-i='" + i + "'>Run order " + esc(o.id) + " - " +
    esc(o.customer) + ", " + esc(o.ageDays) + " days old, $" + esc(o.amount) + ", " +
    esc(o.reason) + ", " + esc(o.priorRefunds) + " prior refunds</button>").join("");
  document.querySelectorAll(".order-btn").forEach((b) =>
    b.addEventListener("click", () => runOrder(ORDERS[+b.dataset.i], false)));
}

function renderLog() {
  if (!log.length) { $("log").innerHTML = "<p class='small'>Nothing recorded yet.</p>"; return; }
  $("log").innerHTML = log.map((e, i) =>
    "<div class='log-item' data-i='" + i + "'>" +
    (i + 1) + ". Order " + esc(e.order.id) + " - " +
    "<span class='badge " + esc(e.decision.decision) + "'>" + esc(e.decision.decision.toUpperCase()) + "</span> " +
    "$" + esc(e.decision.amount) +
    (e.whatIf ? " (WHAT-IF: " + esc(e.order.ageDays) + " days, " + esc(e.order.reason) + ")" : "") +
    "</div>").join("");
  document.querySelectorAll(".log-item").forEach((el) =>
    el.addEventListener("click", () => select(+el.dataset.i)));
}

function select(i) {
  selected = i;
  $("detail").innerHTML = decisionCard(log[i]);
  $("compare").innerHTML = "";
  $("age").value = log[i].order.ageDays;
  $("ageVal").textContent = log[i].order.ageDays;
  $("reason").value = log[i].order.reason;
}

async function runOrder(order, whatIf) {
  $("status").textContent = "SERV Reasoning is deciding...";
  try {
    const r = await fetch("/api/decide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    });
    const data = await r.json();
    if (!r.ok) { $("status").textContent = data.error || ("Decision failed (" + r.status + ")."); return; }
    const entry = { order: { ...order }, decision: data, whatIf: !!whatIf };
    log.push(entry);
    $("status").textContent = "";
    $("model").textContent = "Decided with SERV Reasoning (" + (data.model || "") + "). General information only, not legal advice.";
    renderLog();
    if (whatIf) {
      const old = log[selected];
      const changed = old.decision.decision !== data.decision || old.decision.amount !== data.amount;
      $("compare").innerHTML =
        (changed
          ? "<div class='flip'>The decision changed: " + esc(old.decision.decision.toUpperCase()) +
            " $" + esc(old.decision.amount) + " became " + esc(data.decision.toUpperCase()) +
            " $" + esc(data.amount) + ".</div>"
          : "<div class='same'>The decision stayed the same: " + esc(data.decision.toUpperCase()) +
            " $" + esc(data.amount) + ".</div>") +
        "<h2>Before</h2>" + decisionCard(old) +
        "<h2>After the what-if</h2>" + decisionCard(entry);
      $("detail").innerHTML = decisionCard(entry);
    } else {
      select(log.length - 1);
    }
  } catch (e) {
    $("status").textContent = "Could not reach the server: " + e.message;
  }
}

$("age").addEventListener("input", (e) => { $("ageVal").textContent = e.target.value; });

$("replay").addEventListener("click", () => {
  if (selected < 0) { $("status").textContent = "Run an order first, then change one input."; return; }
  const base = log[selected].order;
  const order = { ...base, ageDays: +$("age").value, reason: $("reason").value };
  runOrder(order, true);
});

renderOrders();
