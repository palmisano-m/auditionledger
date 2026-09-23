"use strict";

const assert = require("assert");
const W = require("./logic.js");

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log("ok", name);
}

test("matty starts with extra beer and a notice", () => {
  const run = W.createRun("matty", W.createRng(3));
  assert.strictEqual(run.beer, 6);
  assert.strictEqual(W.characterById("matty").look, "Wears a cowboy hat");
  const revealed = run.hole.fish.filter((f) => f.revealed);
  assert.strictEqual(revealed.length, 1);
  assert.ok(run.log.some((line) => line.includes("cowboy hat") && line.includes("Beer")));
  assert.ok(run.log.some((line) => line.includes("tiny detail")));
});

test("bagel and hake start with less beer", () => {
  assert.strictEqual(W.createRun("bagel", W.createRng(1)).beer, 2);
  assert.strictEqual(W.createRun("hake", W.createRng(1)).beer, 2);
});

test("bagel starts with bonus wacky worm colors", () => {
  const bagel = W.createRun("bagel", W.createRng(4));
  const matty = W.createRun("matty", W.createRng(4));
  const wacky = W.COLORS.filter((c) => c.wacky);
  assert.ok(wacky.length >= 6);
  for (const color of wacky) {
    assert.strictEqual(bagel.worms[color.id], 2, color.id);
    assert.strictEqual(matty.worms[color.id], 0, color.id);
  }
  assert.ok(bagel.log.some((line) => line.includes("mustache") && line.includes("wacky")));
  assert.strictEqual(W.characterById("bagel").look, "Has a mustache");
});

test("hake keeps eagle, chain, and sandwich", () => {
  const run = W.createRun("hake", W.createRng(8));
  assert.strictEqual(W.hasSandwich(run), true);
  assert.strictEqual(W.characterById("hake").look, "Wears a silver chain");
  assert.ok(run.log.some((line) => line.includes("eagle") && line.includes("sandwich") && line.includes("silver chain")));
  const bite = W.biteSandwich(run);
  assert.strictEqual(bite.ok, true);
  assert.strictEqual(bite.hasSandwich, true);
  assert.strictEqual(W.hasSandwich(run), true);
  assert.strictEqual(run.sandwichBiteUsed, true);
  const again = W.biteSandwich(run);
  assert.strictEqual(again.ok, false);
  assert.ok(again.error.includes("still right here"));
  assert.strictEqual(W.hasSandwich(run), true);
});

test("sandwich bite resets each hole and still never leaves", () => {
  const rng = W.createRng(9);
  const run = W.createRun("hake", rng);
  const before = run.stamina;
  run.line = 2;
  W.biteSandwich(run);
  assert.ok(run.stamina > before);
  assert.strictEqual(run.line, 3);
  run.stamina = 4;
  const shoved = W.shoveOff(run, rng);
  assert.strictEqual(shoved.ok, true);
  assert.strictEqual(run.sandwichBiteUsed, false);
  assert.strictEqual(W.hasSandwich(run), true);
  assert.strictEqual(W.biteSandwich(run).ok, true);
});

test("eagle scouts a hole and can save one miss", () => {
  const run = W.createRun("hake", W.createRng(2));
  assert.strictEqual(W.scoutHole(run).ok, true);
  assert.ok(run.hole.fish.every((f) => f.revealed && f.known));
  assert.strictEqual(W.scoutHole(run).ok, false);

  const fish = run.hole.fish[0];
  fish.favorite = "red";
  fish.tier = "large";
  fish.caught = false;
  run.worms.red = 1;
  run.stamina = 3;
  run.line = 3;
  run.eagleSaveUsed = false;
  const cast = W.castAt(run, fish.uid, "red");
  assert.strictEqual(cast.type, "hook");
  const saved = W.resolveHook(run, fish.uid, false, { chance: () => true, next: () => 0 });
  assert.strictEqual(saved.caught, true);
  assert.strictEqual(saved.eagle, true);
  assert.strictEqual(run.eagleSaveUsed, true);
  assert.ok(run.cooler.some((f) => f.uid === fish.uid));
});

test("eagle save is spent even when the grab misses", () => {
  const run = W.createRun("hake", W.createRng(2));
  const fish = run.hole.fish[0];
  const other = run.hole.fish[1];
  fish.favorite = "red";
  fish.tier = "small";
  other.favorite = "red";
  other.tier = "large";
  run.worms.red = 2;
  run.stamina = 3;
  run.line = 3;
  W.castAt(run, fish.uid, "red");
  const miss = W.resolveHook(run, fish.uid, false, { chance: () => false, next: () => 0 });
  assert.strictEqual(miss.caught, false);
  assert.strictEqual(run.eagleSaveUsed, true);
  assert.strictEqual(run.line, 3);
  W.castAt(run, other.uid, "red");
  const second = W.resolveHook(run, other.uid, false, { chance: () => true, next: () => 0 });
  assert.strictEqual(second.eagle, false);
  assert.strictEqual(second.caught, false);
  assert.strictEqual(run.line, 2);
});

test("a hard miss can snap the line", () => {
  const run = W.createRun("matty", W.createRng(1));
  const fish = run.hole.fish.find((f) => !f.caught);
  fish.favorite = "black";
  fish.tier = "large";
  run.worms.black = 2;
  run.stamina = 2;
  run.line = 1;
  assert.strictEqual(W.castAt(run, fish.uid, "black").type, "hook");
  const miss = W.resolveHook(run, fish.uid, false, { chance: () => false, next: () => 0 });
  assert.strictEqual(miss.caught, false);
  assert.strictEqual(miss.snapped, true);
  assert.strictEqual(run.ending.type, "lose");
  assert.strictEqual(run.ending.reason, "line");
});

test("wrong worms are ruled out and right worms open the hook", () => {
  const run = W.createRun("bagel", W.createRng(6));
  const fish = run.hole.fish[0];
  fish.favorite = "cosmic";
  fish.known = false;
  fish.revealed = false;
  run.worms.red = 1;
  run.worms.cosmic = 1;
  run.stamina = 3;
  const miss = W.castAt(run, fish.uid, "red");
  assert.strictEqual(miss.type, "nobite");
  assert.strictEqual(fish.known, true);
  assert.ok(fish.ruledOut.includes("red"));
  assert.strictEqual(run.worms.red, 0);
  assert.strictEqual(run.stamina, 2);
  const hit = W.castAt(run, fish.uid, "cosmic");
  assert.strictEqual(hit.type, "hook");
  assert.ok(hit.zoneWidth > 0);
  const landed = W.resolveHook(run, fish.uid, true, W.createRng(1));
  assert.strictEqual(landed.caught, true);
  assert.strictEqual(run.tales, fish.tales);
  assert.strictEqual(run.cooler.length, 1);
});

test("beer restores stamina and steadies the next cast", () => {
  const run = W.createRun("matty", W.createRng(1));
  run.stamina = 1;
  run.beer = 2;
  const drank = W.drinkBeer(run);
  assert.strictEqual(drank.ok, true);
  assert.strictEqual(run.stamina, 3);
  assert.strictEqual(run.steady, true);
  assert.strictEqual(run.beer, 1);
  const fish = run.hole.fish[0];
  fish.favorite = "white";
  run.worms.white = 1;
  const cast = W.castAt(run, fish.uid, "white");
  assert.strictEqual(cast.steady, true);
  assert.ok(cast.zoneWidth >= fish.zone + 0.1 - 0.001);
  assert.strictEqual(run.steady, false);
});

test("you cannot cast without stamina or worms", () => {
  const run = W.createRun("bagel", W.createRng(1));
  const fish = run.hole.fish[0];
  run.stamina = 0;
  run.beer = 0;
  run.worms.red = 1;
  assert.strictEqual(W.castAt(run, fish.uid, "red").ok, false);
  assert.strictEqual(run.worms.red, 1);
  run.stamina = 1;
  run.worms.glow = 0;
  assert.strictEqual(W.castAt(run, fish.uid, "glow").ok, false);
});

test("bagel pays less for wacky worms", () => {
  const bagel = W.createRun("bagel", W.createRng(1));
  const hake = W.createRun("hake", W.createRng(1));
  bagel.tales = 6;
  hake.tales = 6;
  assert.strictEqual(W.priceOf(bagel, "wacky"), 6);
  assert.strictEqual(W.priceOf(hake, "wacky"), 11);
  assert.strictEqual(W.buy(bagel, "wacky", "plaid").ok, true);
  assert.strictEqual(bagel.worms.plaid, 3);
  assert.strictEqual(bagel.tales, 0);
  assert.strictEqual(W.buy(hake, "wacky", "plaid").ok, false);
  hake.tales = 11;
  assert.strictEqual(W.buy(hake, "wacky", "plaid").ok, true);
  assert.strictEqual(hake.worms.plaid, 1);
});

test("the last hole holds the old detail and earlier holes do not", () => {
  for (let seed = 1; seed <= 25; seed += 1) {
    const rng = W.createRng(seed);
    const run = W.createRun("matty", rng);
    assert.ok(!run.hole.fish.some((f) => f.speciesId === "legend"));
    assert.strictEqual(run.hole.fish.filter((f) => f.revealed).length, 1);
    for (let i = 0; i < 4; i += 1) {
      run.stamina = 3;
      const res = W.shoveOff(run, rng);
      assert.strictEqual(res.ok, true, "seed " + seed + " hole " + i);
    }
    assert.strictEqual(run.holeIndex, 4);
    assert.strictEqual(run.hole.fish.filter((f) => f.speciesId === "legend").length, 1);
    assert.strictEqual(run.hole.fish.filter((f) => f.revealed).length, 1);
  }
});

test("catching the old detail wins", () => {
  const run = W.createRun("bagel", W.createRng(12));
  const fish = run.hole.fish[0];
  fish.speciesId = "legend";
  fish.favorite = "glow";
  run.worms.glow = 1;
  run.stamina = 1;
  W.castAt(run, fish.uid, "glow");
  const landed = W.resolveHook(run, fish.uid, true, W.createRng(1));
  assert.strictEqual(landed.ending.type, "win");
  assert.ok(W.endBlurb(run).includes("mustache"));
});

test("exhaustion ends a shove with nothing left to drink", () => {
  const run = W.createRun("matty", W.createRng(1));
  run.stamina = 0;
  run.beer = 0;
  const ended = W.shoveOff(run, W.createRng(2));
  assert.strictEqual(ended.ok, false);
  assert.strictEqual(run.ending.reason, "stamina");
  assert.ok(W.endBlurb(run).includes("cowboy hat"));
});

test("hake is not exhausted while the sandwich bite remains", () => {
  const run = W.createRun("hake", W.createRng(1));
  run.stamina = 0;
  run.beer = 0;
  assert.strictEqual(W.isExhausted(run), false);
  const blocked = W.shoveOff(run, W.createRng(1));
  assert.strictEqual(blocked.ok, false);
  assert.strictEqual(run.ending, null);
  assert.ok(blocked.error.includes("Drink"));
  W.biteSandwich(run);
  assert.ok(run.stamina > 0);
  assert.strictEqual(W.hasSandwich(run), true);
});

test("rng is deterministic", () => {
  const a = W.createRng(5);
  const b = W.createRng(5);
  assert.strictEqual(a.next(), b.next());
  assert.strictEqual(a.int(1, 4), b.int(1, 4));
});

console.log(passed + " tests passed");
