const assert = require("assert");
const K = require("./app.js");

function interactiveValues(task, mutate) {
  const values = [];
  for (const tok of task.answer) {
    if (tok.type === "sign") values.push(tok.expected);
    else if (tok.type === "coeff") values.push(String(tok.expected));
  }
  if (mutate) mutate(values, task);
  return values;
}

function flipSecondSign(values, task) {
  let seen = 0;
  let i = 0;
  for (const tok of task.answer) {
    if (tok.type === "static") continue;
    if (tok.type === "sign") {
      seen += 1;
      if (seen === 2) values[i] = -values[i];
    }
    i += 1;
  }
}

let generated = 0;
const types = new Set();

for (let streak = 0; streak < 10; streak++) {
  for (let n = 0; n < 40; n++) {
    const task = K.generateTask(streak, "");
    generated += 1;
    types.add(task.type);
    assert.ok(task.promptHtml, "prompt missing");
    assert.ok(task.answer.length > 0, "answer missing");
    assert.ok(task.explanation, "explanation missing");

    const signs = task.answer.filter((t) => t.type === "sign");
    const coeffs = task.answer.filter((t) => t.type === "coeff");
    assert.ok(signs.length >= 1, "need at least one sign");
    for (const s of signs) {
      assert.ok(s.expected === 1 || s.expected === -1);
    }
    for (const c of coeffs) {
      assert.ok(Number.isInteger(c.expected) && c.expected >= 0);
    }

    const ok = interactiveValues(task);
    assert.strictEqual(K.missingInput(task, ok), null, task.key);
    assert.deepStrictEqual(K.checkAnswer(task, ok), []);

    const emptySigns = ok.map((v, i) => {
      const kinds = task.answer.filter((t) => t.type !== "static");
      return kinds[i].type === "sign" ? null : v;
    });
    assert.ok(K.missingInput(task, emptySigns));

    if (signs.length >= 2) {
      const wrong = interactiveValues(task, flipSecondSign);
      assert.ok(K.checkAnswer(task, wrong).length > 0, "second-sign trap should fail: " + task.key);
    }
  }
}

const samples = {
  klammer: K.genKlammerZahlen,
  terme: K.genKlammerTerme,
  plus: K.genPlusNegativ,
  dist: () => K.genDistributiv(false),
  distHard: () => K.genDistributiv(true),
  aus: K.genAusklammern,
};

for (const [name, fn] of Object.entries(samples)) {
  for (let i = 0; i < 80; i++) {
    const task = fn();
    assert.deepStrictEqual(K.checkAnswer(task, interactiveValues(task)), [], name + " " + task.key);
  }
}

assert.ok(types.has("klammer_zahlen"));
assert.ok(types.has("distributiv") || types.has("distributiv_schwer"));
assert.ok(types.has("ausklammern"));
assert.ok(types.has("plus_negativ"));

for (let i = 0; i < 100; i++) {
  const task = K.genKlammerZahlen();
  const [, outer, t1, t2] = task.key.split(":").map(Number);
  const signs = task.answer.filter((t) => t.type === "sign");
  const r1 = outer * t1;
  const r2 = outer * t2;
  assert.strictEqual(signs[0].expected, r1 < 0 ? -1 : 1, task.key);
  assert.strictEqual(signs[1].expected, r2 < 0 ? -1 : 1, task.key);
  assert.ok(task.promptHtml.includes("("));
  if (outer < 0) assert.ok(task.promptHtml.includes("minus"), task.promptHtml);
}

for (let i = 0; i < 80; i++) {
  const task = K.genDistributiv(true);
  const parts = task.key.split(":");
  const k = Number(parts[1]);
  assert.ok(k < 0);
  assert.ok(task.promptHtml.includes("minus"));
}

assert.strictEqual(K.formatDuration(0), "0 Sekunden");
assert.strictEqual(K.formatDuration(400), "0 Sekunden");
assert.strictEqual(K.formatDuration(1000), "1 Sekunde");
assert.strictEqual(K.formatDuration(45000), "45 Sekunden");
assert.strictEqual(K.formatDuration(60000), "1 Minute");
assert.strictEqual(K.formatDuration(61000), "1 Minute und 1 Sekunde");
assert.strictEqual(K.formatDuration(125000), "2 Minuten und 5 Sekunden");
assert.strictEqual(K.formatDuration(3600000), "1 Stunde");
assert.strictEqual(K.formatDuration(3723000), "1 Stunde, 2 Minuten und 3 Sekunden");
assert.strictEqual(K.formatDuration(7320000), "2 Stunden und 2 Minuten");
assert.strictEqual(K.formatDuration(7322000), "2 Stunden, 2 Minuten und 2 Sekunden");

console.log("OK", generated, "tasks,", [...types].join(", "));
