const TARGET = 10;
const M = "−";

function rand(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fmt(n) {
  if (n < 0) return M + Math.abs(n);
  return String(n);
}

function fmtTerm(coeff, variable, isFirst) {
  const sign = coeff < 0 ? -1 : 1;
  const abs = Math.abs(coeff);
  let body;
  if (variable) {
    body = abs === 1 ? variable : abs + variable;
  } else {
    body = String(abs);
  }
  if (isFirst) return sign < 0 ? M + body : body;
  return (sign < 0 ? " " + M + " " : " + ") + body;
}

function span(cls, text) {
  return '<span class="' + cls + '">' + text + "</span>";
}

function htmlNum(n) {
  return span("n", String(Math.abs(n)));
}

function htmlVar(v) {
  return span("v", v);
}

function htmlSignOp(sign, { leading } = {}) {
  if (sign < 0) return span("s minus", M);
  if (leading) return "";
  return span("s plus", "+");
}

function htmlOuterSign(sign) {
  return sign < 0 ? span("s minus", M) : span("s plus", "+");
}

function htmlSignedTerm(coeff, variable, isFirst) {
  const sign = coeff < 0 ? -1 : 1;
  const abs = Math.abs(coeff);
  let body = "";
  if (variable) {
    if (abs !== 1) body += htmlNum(abs);
    body += htmlVar(variable);
  } else {
    body = htmlNum(abs);
  }
  return htmlSignOp(sign, { leading: isFirst }) + body;
}

function htmlParenTwo(t1, v1, t2, v2) {
  return (
    span("p", "(") +
    htmlSignedTerm(t1, v1, true) +
    htmlSignedTerm(t2, v2, false) +
    span("p", ")")
  );
}

function signTok(expected) {
  return { type: "sign", expected: expected < 0 ? -1 : 1 };
}

function coeffTok(expected, emptyMeans) {
  const tok = { type: "coeff", expected: Math.abs(expected) };
  if (emptyMeans != null) tok.emptyMeans = emptyMeans;
  return tok;
}

function staticTok(html) {
  return { type: "static", html: html };
}

function solutionText(answer) {
  let out = "";
  for (const tok of answer) {
    if (tok.type === "static") {
      out += tok.html.replace(/<[^>]+>/g, "");
    } else if (tok.type === "sign") {
      const minus = tok.expected < 0;
      const prev = out.trimEnd();
      const afterOpen = prev === "" || prev.endsWith("(");
      if (!minus && afterOpen) continue;
      if (!afterOpen) out += " ";
      out += minus ? M : "+";
      if (!afterOpen) out += " ";
    } else if (tok.type === "coeff") {
      if (tok.expected === 1 && tok.emptyMeans === 1) {
        /* Variable folgt, die 1 darf unsichtbar bleiben. */
      } else {
        out += String(tok.expected);
      }
    }
  }
  return out.replace(/\s+/g, " ").trim();
}

function genKlammerZahlen() {
  const a = rand(2, 9);
  let b = rand(2, 9);
  if (b === a) b = a === 9 ? 8 : a + 1;
  const t1 = pick([a, a, -a]);
  const t2 = pick([b, -b]);
  const outer = pick([-1, -1, -1, 1]);
  const r1 = outer * t1;
  const r2 = outer * t2;

  return {
    type: "klammer_zahlen",
    instruction: "Schreibe ohne Klammern. Nicht ausrechnen!",
    promptHtml: htmlOuterSign(outer) + htmlParenTwo(t1, "", t2, ""),
    answer: [
      signTok(r1),
      staticTok(htmlNum(Math.abs(r1))),
      signTok(r2),
      staticTok(htmlNum(Math.abs(r2))),
    ],
    explanation:
      outer < 0
        ? "Ein Minus vor der Klammer dreht jedes Vorzeichen um: aus + wird " +
          M +
          ", aus " +
          M +
          " wird +."
        : "Ein Plus vor der Klammer ändert die Vorzeichen nicht.",
    key: "kz:" + outer + ":" + t1 + ":" + t2,
  };
}

function genKlammerTerme() {
  const v1 = pick(["a", "x"]);
  const v2 = v1 === "a" ? "b" : "y";
  const s1 = pick([1, -1]);
  const s2 = pick([1, -1]);
  const outer = pick([-1, -1, 1]);
  const r1 = outer * s1;
  const r2 = outer * s2;

  return {
    type: "klammer_terme",
    instruction: "Schreibe ohne Klammern.",
    promptHtml: htmlOuterSign(outer) + htmlParenTwo(s1, v1, s2, v2),
    answer: [
      signTok(r1),
      staticTok(htmlVar(v1)),
      signTok(r2),
      staticTok(htmlVar(v2)),
    ],
    explanation:
      outer < 0
        ? "Das Minus gilt für beide Terme, nicht nur für den ersten."
        : "Plus vor der Klammer: die Vorzeichen in der Klammer bleiben.",
    key: "kt:" + outer + ":" + s1 + v1 + ":" + s2 + v2,
  };
}

function genPlusNegativ() {
  const mode = pick(["plus_neg", "minus_neg", "outer_minus", "outer_plus", "var_plus"]);

  if (mode === "var_plus") {
    const v = pick(["a", "x"]);
    const w = v === "a" ? "b" : "y";
    return {
      type: "plus_negativ",
      instruction: "Schreibe ohne Klammern.",
      promptHtml: htmlVar(v) + htmlSignOp(1) + span("p", "(") + htmlSignedTerm(-1, w, true) + span("p", ")"),
      answer: [signTok(1), staticTok(htmlVar(v)), signTok(-1), staticTok(htmlVar(w))],
      explanation: "+(" + M + w + ") ist dasselbe wie " + M + w + ".",
      key: "pn:var:" + v,
    };
  }

  if (mode === "outer_minus") {
    const a = rand(2, 9);
    return {
      type: "plus_negativ",
      instruction: "Vereinfache.",
      promptHtml: htmlOuterSign(-1) + span("p", "(") + htmlSignedTerm(-a, "", true) + span("p", ")"),
      answer: [signTok(1), coeffTok(a)],
      explanation: "Minus mal Minus ergibt Plus: " + M + "(" + M + a + ") = " + a + ".",
      key: "pn:mm:" + a,
    };
  }

  if (mode === "outer_plus") {
    const a = rand(2, 9);
    return {
      type: "plus_negativ",
      instruction: "Vereinfache.",
      promptHtml: htmlOuterSign(1) + span("p", "(") + htmlSignedTerm(-a, "", true) + span("p", ")"),
      answer: [signTok(-1), coeffTok(a)],
      explanation: "Plus ändert nichts: +(" + M + a + ") = " + M + a + ".",
      key: "pn:p:" + a,
    };
  }

  const a = rand(3, 9);
  let b = rand(2, 8);
  if (b === a) b = a - 1;

  if (mode === "minus_neg") {
    const r = a + b;
    return {
      type: "plus_negativ",
      instruction: "Vereinfache.",
      promptHtml: htmlNum(a) + htmlSignOp(-1) + span("p", "(") + htmlSignedTerm(-b, "", true) + span("p", ")"),
      answer: [signTok(r), coeffTok(Math.abs(r))],
      explanation: "Minus vor Minus ergibt Plus: " + a + " " + M + " (" + M + b + ") = " + a + " + " + b + " = " + r + ".",
      key: "pn:mn:" + a + ":" + b,
    };
  }

  const r = a - b;
  return {
    type: "plus_negativ",
    instruction: "Vereinfache.",
    promptHtml: htmlNum(a) + htmlSignOp(1) + span("p", "(") + htmlSignedTerm(-b, "", true) + span("p", ")"),
    answer: [signTok(r), coeffTok(Math.abs(r))],
    explanation: "Plus und Gegenzahl: " + a + " + (" + M + b + ") = " + a + " " + M + " " + b + " = " + fmt(r) + ".",
    key: "pn:pn:" + a + ":" + b,
  };
}

function genDistributiv(hard) {
  const k = hard ? pick([-2, -3, -4, -5, -6]) : pick([2, 3, 4, 5, -2, -3, 2, 3]);
  const v = pick(["x", "y", "a"]);
  const innerCoeff = hard ? pick([1, 1, 2, 3]) : pick([1, 1, 1, 2]);
  const innerVarSign = hard ? pick([1, 1, -1]) : 1;
  const b = rand(2, 8);
  const innerBSign = pick([1, -1]);
  const inner1 = innerVarSign * innerCoeff;
  const inner2 = innerBSign * b;
  const out1 = k * inner1;
  const out2 = k * inner2;

  const kHtml = k < 0 ? span("s minus", M) + htmlNum(k) : htmlNum(k);

  return {
    type: hard ? "distributiv_schwer" : "distributiv",
    instruction: "Klammern mit dem Distributivgesetz auflösen.",
    promptHtml: kHtml + htmlParenTwo(inner1, v, inner2, ""),
    answer: [
      signTok(out1),
      coeffTok(Math.abs(out1), Math.abs(out1) === 1 ? 1 : undefined),
      staticTok(htmlVar(v)),
      signTok(out2),
      coeffTok(Math.abs(out2)),
    ],
    explanation:
      "Der Faktor " +
      fmt(k) +
      " gilt für beide Terme: " +
      fmt(k) +
      " · " +
      fmtTerm(inner1, v, true).replace(/\s/g, "") +
      " = " +
      fmtTerm(out1, v, true).replace(/\s/g, "") +
      ",  " +
      fmt(k) +
      " · " +
      fmt(inner2) +
      " = " +
      fmt(out2) +
      ".",
    key: "d:" + k + ":" + inner1 + v + ":" + inner2,
  };
}

function genAusklammern() {
  const factor = pick([-2, -3, -4, -5, 2, 3, 4]);
  const v = "x";
  const i1 = rand(1, 4);
  const i1sign = pick([1, 1, 1, -1]);
  const i2 = rand(1, 6);
  const i2sign = pick([1, -1]);
  const t1 = factor * i1sign * i1;
  const t2 = factor * i2sign * i2;
  const factorHtml = factor < 0 ? span("s minus", M) + htmlNum(factor) : htmlNum(factor);

  return {
    type: "ausklammern",
    instruction: "Klammere " + fmt(factor) + " aus.",
    promptHtml: htmlSignedTerm(t1, v, true) + htmlSignedTerm(t2, "", false),
    answer: [
      staticTok(factorHtml),
      staticTok(span("p", "(")),
      signTok(i1sign),
      coeffTok(i1, i1 === 1 ? 1 : undefined),
      staticTok(htmlVar(v)),
      signTok(i2sign),
      coeffTok(i2),
      staticTok(span("p", ")")),
    ],
    explanation:
      "Probe: " +
      fmt(factor) +
      " · (" +
      fmtTerm(i1sign * i1, v, true).replace(/\s/g, "") +
      fmtTerm(i2sign * i2, "", false) +
      ") muss wieder " +
      fmtTerm(t1, v, true).replace(/\s/g, "") +
      fmtTerm(t2, "", false) +
      " ergeben.",
    key: "ak:" + factor + ":" + i1sign + i1 + ":" + i2sign + i2,
  };
}

function pickType(streak) {
  if (streak <= 1) return pick(["klammer_zahlen", "plus_negativ", "klammer_zahlen"]);
  if (streak <= 3) return pick(["klammer_zahlen", "klammer_terme", "plus_negativ"]);
  if (streak <= 6) return pick(["distributiv", "klammer_terme", "distributiv", "plus_negativ"]);
  return pick(["distributiv_schwer", "ausklammern", "distributiv_schwer", "ausklammern"]);
}

function generateTask(streak, avoidKey) {
  let task;
  for (let i = 0; i < 12; i++) {
    const type = pickType(streak);
    if (type === "klammer_zahlen") task = genKlammerZahlen();
    else if (type === "klammer_terme") task = genKlammerTerme();
    else if (type === "plus_negativ") task = genPlusNegativ();
    else if (type === "distributiv") task = genDistributiv(false);
    else if (type === "distributiv_schwer") task = genDistributiv(true);
    else task = genAusklammern();
    if (task.key !== avoidKey) break;
  }
  return task;
}

function parseCoeff(raw, emptyMeans) {
  const t = String(raw ?? "").trim();
  if (t === "" && emptyMeans != null) return emptyMeans;
  if (!/^\d+$/.test(t)) return NaN;
  return Number(t);
}

function checkAnswer(task, values) {
  const errors = [];
  let i = 0;
  for (const tok of task.answer) {
    if (tok.type === "static") continue;
    const val = values[i++];
    if (tok.type === "sign") {
      if (val !== tok.expected) errors.push({ kind: "sign", expected: tok.expected });
    } else if (tok.type === "coeff") {
      const n = parseCoeff(val, tok.emptyMeans);
      if (n !== tok.expected) errors.push({ kind: "coeff", expected: tok.expected });
    }
  }
  return errors;
}

function missingInput(task, values) {
  let i = 0;
  for (const tok of task.answer) {
    if (tok.type === "static") continue;
    const val = values[i++];
    if (tok.type === "sign" && val !== 1 && val !== -1) return "Bitte alle Vorzeichen wählen.";
    if (tok.type === "coeff") {
      const t = String(val ?? "").trim();
      if (t === "" && tok.emptyMeans == null) return "Bitte die Zahlen eintragen.";
      if (t !== "" && !/^\d+$/.test(t)) return "Nur positive ganze Zahlen in die Kästchen.";
    }
  }
  return null;
}

function unit(n, one, many) {
  return n === 1 ? "1 " + one : n + " " + many;
}

function formatDuration(ms) {
  const totalSec = Math.max(0, Math.round(Number(ms) / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const parts = [];
  if (hours) parts.push(unit(hours, "Stunde", "Stunden"));
  if (minutes) parts.push(unit(minutes, "Minute", "Minuten"));
  if (seconds || parts.length === 0) parts.push(unit(seconds, "Sekunde", "Sekunden"));
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] + " und " + parts[1];
  return parts[0] + ", " + parts[1] + " und " + parts[2];
}

const Klammern = {
  TARGET,
  generateTask,
  checkAnswer,
  missingInput,
  parseCoeff,
  genKlammerZahlen,
  genKlammerTerme,
  genPlusNegativ,
  genDistributiv,
  genAusklammern,
  solutionText,
  formatDuration,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = Klammern;
}

const ui = {
  streak: 0,
  task: null,
  lastKey: "",
  locked: false,
  startedAt: 0,
};

function $(id) {
  return document.getElementById(id);
}

function showScreen(name) {
  $("screen-start").hidden = name !== "start";
  $("screen-play").hidden = name !== "play";
  $("screen-win").hidden = name !== "win";
  $("progress").hidden = name === "start";
}

function renderDots(flashLost) {
  const dots = $("dots");
  dots.innerHTML = "";
  for (let i = 0; i < TARGET; i++) {
    const d = document.createElement("span");
    d.className = "dot";
    if (i < ui.streak) d.classList.add("on");
    if (flashLost) d.classList.add("lost");
    dots.appendChild(d);
  }
  $("score").textContent = ui.streak + "/" + TARGET;
  $("dots").setAttribute("aria-label", ui.streak + " von " + TARGET + " richtig in Folge");
}

function renderAnswerRow(task, review) {
  const row = $("answer-row");
  row.innerHTML = "";
  let interactive = 0;

  for (const tok of task.answer) {
    if (tok.type === "static") {
      const el = document.createElement("span");
      el.className = "static-math";
      el.innerHTML = tok.html;
      row.appendChild(el);
      continue;
    }

    const idx = interactive++;
    const judged = review && review[idx];

    if (tok.type === "sign") {
      const pair = document.createElement("div");
      pair.className = "sign-pair";
      pair.dataset.idx = String(idx);
      if (judged === "ok") pair.classList.add("ok");
      if (judged === "bad") pair.classList.add("bad");

      for (const [val, cls, label] of [
        [1, "plus", "+"],
        [-1, "minus", M],
      ]) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "sign-btn " + cls;
        btn.dataset.val = String(val);
        btn.textContent = label;
        btn.setAttribute("aria-label", val < 0 ? "Minus" : "Plus");
        if (review && tok.expected === val) btn.classList.add("selected", cls);
        btn.addEventListener("click", () => {
          if (ui.locked) return;
          pair.querySelectorAll(".sign-btn").forEach((b) => b.classList.remove("selected", "plus", "minus"));
          btn.classList.add("selected", cls);
        });
        pair.appendChild(btn);
      }
      row.appendChild(pair);
    } else if (tok.type === "coeff") {
      const input = document.createElement("input");
      input.className = "coeff";
      input.dataset.idx = String(idx);
      input.inputMode = "numeric";
      input.autocomplete = "off";
      input.setAttribute("aria-label", "Zahl");
      if (tok.emptyMeans === 1) input.placeholder = "";
      if (review) {
        input.value = String(tok.expected === 1 && tok.emptyMeans === 1 ? "" : tok.expected);
        input.disabled = true;
        if (judged) input.classList.add(judged);
      }
      row.appendChild(input);
    }
  }
}

function readValues() {
  const values = [];
  const row = $("answer-row");
  row.querySelectorAll(".sign-pair, input.coeff").forEach((el) => {
    if (el.classList.contains("sign-pair")) {
      const sel = el.querySelector(".sign-btn.selected");
      values.push(sel ? Number(sel.dataset.val) : null);
    } else {
      values.push(el.value);
    }
  });
  return values;
}

function setPlayChrome(mode) {
  $("btn-check").hidden = mode !== "edit";
  $("btn-next").hidden = mode !== "next";
  $("btn-check").disabled = mode !== "edit";
}

function loadTask() {
  if (!ui.startedAt) ui.startedAt = Date.now();
  ui.task = generateTask(ui.streak, ui.lastKey);
  ui.lastKey = ui.task.key;
  ui.locked = false;
  $("instruction").textContent = ui.task.instruction;
  $("prompt").innerHTML = ui.task.promptHtml;
  $("feedback").hidden = true;
  $("feedback").className = "feedback";
  $("form-hint").hidden = true;
  renderAnswerRow(ui.task, null);
  setPlayChrome("edit");
  renderDots(false);
  const first = $("answer-row").querySelector("input.coeff, .sign-btn");
  if (first) first.focus();
}

function startGame() {
  ui.streak = 0;
  ui.lastKey = "";
  ui.startedAt = 0;
  showScreen("play");
  loadTask();
}

function showWin() {
  const elapsed = ui.startedAt ? Date.now() - ui.startedAt : 0;
  $("win-time").textContent = "Das hat " + formatDuration(elapsed) + " gedauert.";
  showScreen("win");
}

function onCheck(event) {
  event.preventDefault();
  if (ui.locked) return;

  const values = readValues();
  const missing = missingInput(ui.task, values);
  if (missing) {
    const hint = $("form-hint");
    hint.hidden = false;
    hint.textContent = missing;
    $("answer-row").classList.remove("shake");
    void $("answer-row").offsetWidth;
    $("answer-row").classList.add("shake");
    return;
  }

  $("form-hint").hidden = true;
  const errors = checkAnswer(ui.task, values);
  const review = {};
  let i = 0;
  for (const tok of ui.task.answer) {
    if (tok.type === "static") continue;
    const val = values[i];
    if (tok.type === "sign") review[i] = val === tok.expected ? "ok" : "bad";
    else review[i] = parseCoeff(val, tok.emptyMeans) === tok.expected ? "ok" : "bad";
    i += 1;
  }

  ui.locked = true;
  const fb = $("feedback");
  fb.hidden = false;

  if (errors.length === 0) {
    ui.streak += 1;
    renderDots(false);
    fb.className = "feedback richtig";
    fb.textContent = ui.streak === TARGET ? "Richtig — das war die zehnte!" : "Richtig.";
    renderAnswerRow(ui.task, review);
    if (ui.streak >= TARGET) {
      setTimeout(showWin, 700);
      return;
    }
    setTimeout(loadTask, 750);
  } else {
    ui.streak = 0;
    ui.startedAt = 0;
    renderDots(true);
    fb.className = "feedback falsch";
    fb.innerHTML =
      "<strong>Nicht ganz.</strong> Richtige Form: " +
      '<div class="loesung">' +
      solutionText(ui.task.answer) +
      "</div>" +
      ui.task.explanation;
    renderAnswerRow(ui.task, review);
    $("answer-row")
      .querySelectorAll("button, input")
      .forEach((el) => {
        el.disabled = true;
      });
    setPlayChrome("next");
  }
}

function boot() {
  for (let i = 0; i < TARGET; i++) {
    const d = document.createElement("span");
    d.className = "dot";
    $("dots").appendChild(d);
  }

  $("btn-start").addEventListener("click", startGame);
  $("btn-again").addEventListener("click", startGame);
  $("btn-next").addEventListener("click", loadTask);
  $("answer-form").addEventListener("submit", onCheck);
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", boot);
}
