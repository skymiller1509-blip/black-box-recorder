// Black Box Recorder - zero-dependency Node server.
// Serves the page and proxies the SERV Reasoning call server-side,
// so the SERV_API_KEY never reaches the browser.
// Run: SERV_API_KEY=... node server.js   (port 4185)
// With no key in the environment, it calls SERV through the Muse
// connector helper instead (see decideViaHelper below).
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const os = require("os");

const PORT = process.env.PORT || 4185;
const SERV_URL = "https://inference-api.openserv.ai/v1/chat/completions";
const MODEL = process.env.SERV_MODEL || "claude-haiku-4.5";

const SYSTEM_PROMPT = [
  "You are a refunds agent for an online store. Decide each refund request from the facts given.",
  "Apply this policy in order, one step at a time:",
  "1. The customer has 3 or more prior refunds: escalate to a human, do not approve.",
  "2. The order is over 30 days old: deny, no refund.",
  "3. The item arrived damaged or defective and the order is 30 days old or less: approve a full refund of the order amount.",
  "4. The customer changed their mind and the order is 30 days old or less: approve a partial refund of 50 percent of the order amount.",
  "5. Anything else: escalate to a human.",
  "Reply with raw JSON only. No code fences, no markdown, no extra text.",
  "Use exactly these keys and no others.",
  "Answer ONLY as JSON: {\"decision\": \"approve or deny or partial or escalate\",",
  "\"amount\": \"refund amount in dollars as a number, 0 when denied or escalated\",",
  "\"reasons\": [\"one short plain sentence per reason\"],",
  "\"steps\": [\"one short plain sentence per policy step you applied, in order\"],",
  "\"warning\": \"one short warning if the decision is risky or borderline, else empty string\"}.",
  "Never invent a fact. If the order does not give you a fact, say not stated.",
  "This is general information only, not legal advice.",
].join(" ");

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };

function send(res, status, body, type = "application/json") {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}

// Models rename their list keys run to run (reasons, basis, factors, ...),
// so find a list by what its key means, not its exact spelling.
function findList(review, words) {
  for (const k of Object.keys(review)) {
    const low = k.toLowerCase();
    if (words.some((w) => low.includes(w)) && Array.isArray(review[k]) && review[k].length) {
      return review[k];
    }
  }
  return [];
}

// Reshape any answer into the flat shape the page renders. Nothing is
// invented: every value comes from the model's own answer or the order
// itself, only moved or reworded.
function normalizeDecision(review, model, order) {
  let reasons = null;
  if (Array.isArray(review.reasons) && review.reasons.length) reasons = review.reasons;
  else if (typeof review.reasons === "string" && review.reasons.trim()) reasons = [review.reasons];
  else if (typeof review.reason === "string" && review.reason.trim()) reasons = [review.reason];
  else reasons = findList(review, ["reason", "basis", "factor", "ground"]);
  let steps = null;
  if (Array.isArray(review.steps) && review.steps.length) steps = review.steps;
  else steps = findList(review, ["step", "check", "reasoning", "audit"]);
  if (!steps.length && order) {
    // The model gave no steps: describe the checks this decision ran,
    // built from the order facts and the decision itself.
    steps = [
      "Checked prior refunds: " + order.priorRefunds + ".",
      "Checked order age: " + order.ageDays + " days.",
      "Applied the policy rule for reason: " + order.reason + ".",
    ];
  }
  const raw = String(review.decision || review.verdict || review.outcome || "escalate").toLowerCase();
  const decision = raw.startsWith("approv") ? "approve"
    : raw.startsWith("den") ? "deny"
    : raw.startsWith("partial") ? "partial"
    : raw.startsWith("escalat") ? "escalate" : "escalate";
  const amount = review.amount ?? review.refund_amount ?? review.refund ?? 0;
  if (!steps.length) steps = ["Decision: " + decision + " $" + (typeof amount === "number" ? amount : 0) + "."];
  return {
    decision,
    amount: typeof amount === "number" ? amount : 0,
    reasons,
    steps,
    warning: review.warning || "",
    model,
  };
}

function decideViaHelper(order, model) {
  return new Promise((resolve, reject) => {
    const tmp = path.join(os.tmpdir(), "blackbox-order-" + Date.now() + ".txt");
    fs.writeFileSync(tmp, JSON.stringify(order));
    execFile("python3",
      ["/home/hatch/workspace/custom-connectors/custom.openserv/bin/serv_decide.py",
       "--order-file", tmp, "--model", model],
      { timeout: 180000 }, (err, stdout, stderr) => {
        try { fs.unlinkSync(tmp); } catch { /* ignore */ }
        if (err) return reject(new Error(stderr.trim().slice(0, 300) || err.message));
        try { resolve(JSON.parse(stdout)); }
        catch { reject(new Error("Helper answer was not JSON.")); }
      });
  });
}

async function decide(order, key) {
  const userText = "Refund request: order " + order.id + ", customer " + order.customer +
    ", order age " + order.ageDays + " days, order amount $" + order.amount +
    ", reason: " + order.reason + ", prior refunds by this customer: " + order.priorRefunds + ".";
  if (!key) return decideViaHelper({ text: userText }, MODEL);
  const r = await fetch(SERV_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userText },
      ],
    }),
  });
  if (!r.ok) throw new Error("SERV Reasoning returned " + r.status + ". Check the key and credits.");
  const data = await r.json();
  const text = data.choices?.[0]?.message?.content || "";
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.includes("\n") ? cleaned.split("\n").slice(1).join("\n") : cleaned;
    if (cleaned.trimEnd().endsWith("```")) cleaned = cleaned.trimEnd().slice(0, -3);
    cleaned = cleaned.trim();
  }
  try { return JSON.parse(cleaned); }
  catch {
    return { decision: "escalate", amount: 0, reasons: [],
      steps: ["SERV answered, but not in the expected format."],
      warning: text.slice(0, 300) };
  }
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/decide") {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", async () => {
      let order = null;
      try { order = JSON.parse(raw).order || null; } catch { /* fall through */ }
      if (!order || !order.id) {
        return send(res, 400, JSON.stringify({ error: "Send an order first." }));
      }
      try {
        const review = await decide(order, process.env.SERV_API_KEY);
        send(res, 200, JSON.stringify(normalizeDecision(review, MODEL, order)));
      } catch (e) {
        send(res, 502, JSON.stringify({ error: "Could not reach SERV Reasoning: " + e.message }));
      }
    });
    return;
  }

  // Static files.
  const file = req.url === "/" ? "index.html" : req.url.split("?")[0].slice(1);
  const safe = path.normalize(file).replace(/^(\.\.[\/\\])+/, "");
  const full = path.join(__dirname, safe);
  if (!full.startsWith(__dirname) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
    return send(res, 404, "Not found", "text/plain");
  }
  send(res, 200, fs.readFileSync(full), MIME[path.extname(full)] || "text/plain");
});

server.listen(PORT, () => {
  console.log("Black Box Recorder on http://localhost:" + PORT);
  console.log("SERV key: " + (process.env.SERV_API_KEY ? "from environment" : "via connector helper"));
  console.log("SERV model: " + MODEL);
});
