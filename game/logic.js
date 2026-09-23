/**
 * Wacky Water — fishing roguelike rules.
 * Pure state in, pure state out. The page layer owns rendering.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.WackyWater = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const COLORS = [
    { id: "red", name: "Red", wacky: false },
    { id: "brown", name: "Brown", wacky: false },
    { id: "chartreuse", name: "Chartreuse", wacky: false },
    { id: "black", name: "Black", wacky: false },
    { id: "white", name: "White", wacky: false },
    { id: "cosmic", name: "Cosmic Purple", wacky: true },
    { id: "safety", name: "Safety Orange", wacky: true },
    { id: "plaid", name: "Plaid", wacky: true },
    { id: "glow", name: "Glow Green", wacky: true },
    { id: "polka", name: "Polka Dot", wacky: true },
    { id: "mustard", name: "Mustard Swirl", wacky: true },
  ];

  const CHARACTERS = [
    {
      id: "matty",
      name: "Matty Tiny Detail Noticer",
      short: "Matty",
      look: "Wears a cowboy hat",
      tag: "Cowboy hat · extra Beer",
      perk: "Extra Beer — a six-pack to start. At every hole he notices one fish's favorite worm color.",
      beer: 6,
    },
    {
      id: "bagel",
      name: "Bagel",
      short: "Bagel",
      look: "Has a mustache",
      tag: "Mustache · wacky worms",
      perk: "Bonus wacky worm colors from the first cast: Cosmic Purple, Safety Orange, Plaid, Glow Green, Polka Dot, and Mustard Swirl. The dock sells him more for less.",
      beer: 2,
    },
    {
      id: "hake",
      name: "Hake",
      short: "Hake",
      look: "Wears a silver chain",
      tag: "Silver chain · eagle · sandwich",
      perk: "An eagle companion scouts the hole and can snatch a missed fish. Hake wears a silver chain and has a sandwich with him at all times.",
      beer: 2,
    },
  ];

  const HOLES = [
    {
      name: "Muddy Bend",
      blurb: "The water is the color of coffee with too much cream.",
    },
    {
      name: "Lily Pad Pocket",
      blurb: "Pads tick like a slow clock. Something knocks them from below.",
    },
    {
      name: "Railroad Trestle",
      blurb: "Shade, bolts, and a deep slot where lunkers sulk.",
    },
    {
      name: "Moonlit Cut",
      blurb: "The river narrows. Eyes shine where there should be weeds.",
    },
    {
      name: "The Deep Detail",
      blurb: "Everything here is a tiny detail, including the thing that eats them.",
    },
  ];

  const PLANS = [
    ["small", "small", "small", "small"],
    ["small", "small", "medium", "medium"],
    ["small", "medium", "medium", "large"],
    ["medium", "medium", "large", "large"],
    ["legendary", "large", "large"],
  ];

  const SPECIES = [
    { id: "bluegill", name: "Bluegill", tier: "small", holes: [0, 1], colors: ["red", "chartreuse"], hint: "Likes a small bright worm", zone: 0.34, tales: [4, 6], weight: [0.4, 0.9] },
    { id: "sunfish", name: "Pumpkin Sunfish", tier: "small", holes: [0, 1], colors: ["safety", "chartreuse", "mustard"], hint: "Chases loud, sunny colors", zone: 0.32, tales: [4, 6], weight: [0.3, 0.8] },
    { id: "chub", name: "Creek Chub", tier: "small", holes: [0, 1, 2], colors: ["brown", "white"], hint: "Noses dull, muddy worms", zone: 0.3, tales: [5, 7], weight: [0.5, 1.2] },
    { id: "perch", name: "Yellow Perch", tier: "small", holes: [0, 1, 2], colors: ["chartreuse", "glow", "mustard"], hint: "Follows yellow-green", zone: 0.28, tales: [6, 8], weight: [0.6, 1.5] },
    { id: "bass", name: "Largemouth Bass", tier: "medium", holes: [1, 2, 3], colors: ["black", "red"], hint: "Wants a dark or red worm", zone: 0.22, tales: [11, 15], weight: [1.8, 4.5] },
    { id: "cat", name: "Channel Cat", tier: "medium", holes: [1, 2, 3], colors: ["brown", "mustard"], hint: "Wants something funky and brown", zone: 0.24, tales: [12, 16], weight: [2.2, 6.5] },
    { id: "trout", name: "Rainbow Trout", tier: "medium", holes: [1, 2, 3, 4], colors: ["white", "polka", "red"], hint: "Picky, and a little vain", zone: 0.2, tales: [12, 16], weight: [1.4, 3.8] },
    { id: "walleye", name: "Walleye", tier: "medium", holes: [2, 3], colors: ["chartreuse", "glow"], hint: "Hunts a glowing or yellow worm", zone: 0.18, tales: [15, 20], weight: [2.0, 5.5] },
    { id: "muskie", name: "Muskie", tier: "large", holes: [2, 3, 4], colors: ["black", "cosmic"], hint: "Only commits to something dramatic", zone: 0.16, tales: [26, 34], weight: [8, 18] },
    { id: "carp", name: "Golden Carp", tier: "large", holes: [3, 4], colors: ["mustard", "polka", "safety"], hint: "Wants a wacky worm", zone: 0.16, tales: [24, 32], weight: [6, 15] },
    { id: "pike", name: "Night Pike", tier: "large", holes: [3, 4], colors: ["plaid", "safety", "cosmic"], hint: "Strikes loud patterns", zone: 0.15, tales: [24, 32], weight: [5, 13] },
    { id: "legend", name: "The Old Detail", tier: "legendary", holes: [4], colors: ["black", "cosmic", "glow", "plaid", "white"], hint: "The tiny detail is the whole river", zone: 0.13, tales: [60, 80], weight: [22, 41] },
  ];

  const PRICES = { beer: 8, worm: 4, wacky: 11, wackyBagel: 6, mend: 14 };
  const MAX_WORMS = 9;
  const EAGLE_SAVE = { small: 0.55, medium: 0.4, large: 0.3, legendary: 0.22 };

  function createRng(seed) {
    let s = (seed == null ? Math.random() * 0x100000000 : seed) >>> 0;
    return {
      next() {
        s = (Math.imul(1664525, s) + 1013904223) >>> 0;
        return s / 4294967296;
      },
      chance(p) {
        return this.next() < p;
      },
      int(min, max) {
        return min + Math.floor(this.next() * (max - min + 1));
      },
      pick(arr) {
        return arr[this.int(0, arr.length - 1)];
      },
      range(min, max, places) {
        const n = min + this.next() * (max - min);
        const m = 10 ** (places == null ? 1 : places);
        return Math.round(n * m) / m;
      },
    };
  }

  function characterById(id) {
    const character = CHARACTERS.find((c) => c.id === id);
    if (!character) throw new Error("Unknown angler: " + id);
    return character;
  }

  function colorById(id) {
    return COLORS.find((c) => c.id === id) || null;
  }

  function colorName(id) {
    return colorById(id)?.name || id;
  }

  function note(run, text) {
    run.log.push(String(text));
    if (run.log.length > 8) run.log.splice(0, run.log.length - 8);
  }

  function emptyWorms() {
    const worms = {};
    for (const color of COLORS) worms[color.id] = 0;
    return worms;
  }

  function startingWorms(characterId) {
    const worms = emptyWorms();
    worms.red = 3;
    worms.brown = 3;
    worms.chartreuse = 3;
    worms.black = 2;
    worms.white = 2;
    if (characterId === "bagel") {
      for (const color of COLORS) {
        if (color.wacky) worms[color.id] = 2;
      }
    }
    return worms;
  }

  function pickSpecies(tier, holeIndex, used, rng) {
    let pool = SPECIES.filter((s) => s.tier === tier && s.holes.includes(holeIndex) && !used.has(s.id));
    if (!pool.length) pool = SPECIES.filter((s) => s.tier === tier && s.holes.includes(holeIndex));
    if (!pool.length) pool = SPECIES.filter((s) => s.tier === tier);
    const spec = rng.pick(pool);
    used.add(spec.id);
    return spec;
  }

  function spawnFish(spec, holeIndex, n, rng) {
    return {
      uid: "h" + holeIndex + "-" + n,
      speciesId: spec.id,
      name: spec.name,
      tier: spec.tier,
      hint: spec.hint,
      zone: spec.zone,
      favorite: rng.pick(spec.colors),
      weight: rng.range(spec.weight[0], spec.weight[1], 1),
      tales: rng.int(spec.tales[0], spec.tales[1]),
      known: false,
      revealed: false,
      ruledOut: [],
      caught: false,
    };
  }

  function generateHole(holeIndex, rng) {
    const used = new Set();
    const plan = PLANS[holeIndex];
    const fish = plan.map((tier, n) => spawnFish(pickSpecies(tier, holeIndex, used, rng), holeIndex, n, rng));
    return {
      index: holeIndex,
      name: HOLES[holeIndex].name,
      blurb: HOLES[holeIndex].blurb,
      fish,
    };
  }

  function noticeDetail(run, rng) {
    const pool = run.hole.fish.filter((f) => !f.caught && !f.revealed);
    if (!pool.length) return null;
    const fish = rng.pick(pool);
    fish.known = true;
    fish.revealed = true;
    note(run, "Matty notices a tiny detail: " + fish.name + " wants " + colorName(fish.favorite) + ".");
    return fish;
  }

  function enterHole(run, rng) {
    run.hole = generateHole(run.holeIndex, rng);
    run.scouted = false;
    run.sandwichBiteUsed = false;
    run.eagleSaveUsed = false;
    run.steady = false;
    note(run, run.hole.name + ". " + run.hole.blurb);
    if (run.characterId === "matty") noticeDetail(run, rng);
  }

  function createRun(characterId, rng) {
    const character = characterById(characterId);
    const run = {
      characterId,
      beer: character.beer,
      stamina: 5,
      maxStamina: 6,
      line: 3,
      maxLine: 3,
      tales: 0,
      worms: startingWorms(characterId),
      cooler: [],
      holeIndex: 0,
      hole: null,
      steady: false,
      scouted: false,
      sandwichBiteUsed: false,
      eagleSaveUsed: false,
      log: [],
      ending: null,
    };
    if (characterId === "matty") {
      note(run, "Matty tips his cowboy hat. Extra Beer clinks in the pocket — a full six-pack.");
    } else if (characterId === "bagel") {
      note(run, "Bagel smooths his mustache. Bonus wacky worm colors crowd the tackle box.");
    } else {
      note(run, "Hake's silver chain catches the light. The eagle companion takes the sky, and the sandwich is with him at all times.");
    }
    enterHole(run, rng);
    return run;
  }

  function hasSandwich(run) {
    return run.characterId === "hake";
  }

  function canRecover(run) {
    if (run.beer > 0) return true;
    if (hasSandwich(run) && !run.sandwichBiteUsed) return true;
    return false;
  }

  function isExhausted(run) {
    return run.stamina <= 0 && !canRecover(run);
  }

  function totalWeight(run) {
    const sum = run.cooler.reduce((s, fish) => s + fish.weight, 0);
    return Math.round(sum * 10) / 10;
  }

  function findFish(run, fishUid) {
    return run.hole.fish.find((f) => f.uid === fishUid) || null;
  }

  function drinkBeer(run) {
    if (run.ending) return { ok: false, error: "Too late for a Beer." };
    if (run.beer < 1) return { ok: false, error: "No Beer left." };
    run.beer -= 1;
    const before = run.stamina;
    run.stamina = Math.min(run.maxStamina, run.stamina + 2);
    run.steady = true;
    return { ok: true, gained: run.stamina - before };
  }

  function biteSandwich(run) {
    if (!hasSandwich(run)) return { ok: false, error: "That is not your sandwich." };
    if (run.ending) return { ok: false, error: "The run is over." };
    if (run.sandwichBiteUsed) {
      return { ok: false, error: "You already took this hole's bite. The sandwich is still right here." };
    }
    run.sandwichBiteUsed = true;
    run.stamina = Math.min(run.maxStamina, run.stamina + 3);
    run.line = Math.min(run.maxLine, run.line + 1);
    return { ok: true, hasSandwich: true };
  }

  function scoutHole(run) {
    if (run.characterId !== "hake") return { ok: false, error: "The eagle answers to Hake." };
    if (run.ending) return { ok: false, error: "The run is over." };
    if (run.scouted) return { ok: false, error: "The eagle already made a lap this hole." };
    run.scouted = true;
    for (const fish of run.hole.fish) {
      if (!fish.caught) {
        fish.known = true;
        fish.revealed = true;
      }
    }
    return { ok: true };
  }

  function castAt(run, fishUid, colorId) {
    if (run.ending) return { ok: false, error: "The run is over." };
    const fish = findFish(run, fishUid);
    if (!fish || fish.caught) return { ok: false, error: "That fish is gone." };
    const color = colorById(colorId);
    if (!color) return { ok: false, error: "Pick a worm." };
    if (!run.worms[colorId]) return { ok: false, error: "You're out of " + color.name + "." };
    if (run.stamina < 1) return { ok: false, error: "Out of stamina. Drink a Beer or take a bite." };
    run.worms[colorId] -= 1;
    run.stamina -= 1;
    const steady = run.steady;
    run.steady = false;
    fish.known = true;
    if (fish.favorite !== colorId) {
      if (!fish.ruledOut.includes(colorId)) fish.ruledOut.push(colorId);
      return { ok: true, type: "nobite", fish, colorId, steady };
    }
    fish.revealed = true;
    const zoneWidth = Math.min(0.46, fish.zone + (steady ? 0.1 : 0));
    return { ok: true, type: "hook", fish, colorId, steady, zoneWidth };
  }

  function landFish(run, fish, eagle) {
    fish.caught = true;
    fish.known = true;
    fish.revealed = true;
    run.cooler.push({
      uid: fish.uid,
      speciesId: fish.speciesId,
      name: fish.name,
      tier: fish.tier,
      weight: fish.weight,
      tales: fish.tales,
    });
    run.tales += fish.tales;
    if (fish.speciesId === "legend") {
      run.ending = { type: "win", reason: "legend" };
    }
    return {
      ok: true,
      caught: true,
      eagle,
      lineDamage: 0,
      snapped: false,
      fish,
      ending: run.ending,
    };
  }

  function applyLineDamage(run, fish, rng) {
    let dmg = 0;
    if (fish.tier === "medium") dmg = rng.chance(0.5) ? 1 : 0;
    if (fish.tier === "large" || fish.tier === "legendary") dmg = 1;
    run.line = Math.max(0, run.line - dmg);
    if (run.line <= 0) run.ending = { type: "lose", reason: "line" };
    return dmg;
  }

  function resolveHook(run, fishUid, hit, rng) {
    const fish = findFish(run, fishUid);
    if (!fish || fish.caught) return { ok: false, error: "Too late." };
    if (run.ending) return { ok: false, error: "The run is over." };
    if (hit) return landFish(run, fish, false);
    if (run.characterId === "hake" && !run.eagleSaveUsed) {
      run.eagleSaveUsed = true;
      const odds = EAGLE_SAVE[fish.tier] ?? 0.3;
      if (rng.chance(odds)) return landFish(run, fish, true);
    }
    const lineDamage = applyLineDamage(run, fish, rng);
    return {
      ok: true,
      caught: false,
      eagle: false,
      lineDamage,
      snapped: run.line <= 0,
      fish,
      ending: run.ending,
    };
  }

  function leaveForShop(run) {
    if (run.ending) return { ok: false, error: "The run is over." };
    if (run.holeIndex >= HOLES.length - 1) return { ok: false, error: "There is no dock beyond the deep." };
    if (isExhausted(run)) {
      run.ending = { type: "lose", reason: "stamina" };
      return { ok: false, ending: run.ending };
    }
    return { ok: true };
  }

  function priceOf(run, kind) {
    if (kind === "beer") return PRICES.beer;
    if (kind === "worm") return PRICES.worm;
    if (kind === "wacky") return run.characterId === "bagel" ? PRICES.wackyBagel : PRICES.wacky;
    if (kind === "mend") return PRICES.mend;
    return Infinity;
  }

  function buy(run, kind, colorId) {
    if (run.ending) return { ok: false, error: "The run is over." };
    const price = priceOf(run, kind);
    if (run.tales < price) return { ok: false, error: "Not enough tales." };
    if (kind === "beer") {
      run.tales -= price;
      run.beer += 1;
      return { ok: true, kind };
    }
    if (kind === "mend") {
      if (run.line >= run.maxLine) return { ok: false, error: "The line is already sound." };
      run.tales -= price;
      run.line += 1;
      return { ok: true, kind };
    }
    if (kind === "worm" || kind === "wacky") {
      const color = colorById(colorId);
      if (!color) return { ok: false, error: "Unknown worm." };
      if (kind === "worm" && color.wacky) return { ok: false, error: "That worm is wacky." };
      if (kind === "wacky" && !color.wacky) return { ok: false, error: "That worm is ordinary." };
      if ((run.worms[colorId] || 0) >= MAX_WORMS) return { ok: false, error: "That color is stuffed in the box." };
      run.tales -= price;
      run.worms[colorId] += 1;
      return { ok: true, kind, colorId };
    }
    return { ok: false, error: "The dock doesn't sell that." };
  }

  function shoveOff(run, rng) {
    if (run.ending) return { ok: false, error: "The run is over." };
    if (run.holeIndex >= HOLES.length - 1) return { ok: false, error: "This is the last water." };
    if (run.stamina <= 0) {
      if (isExhausted(run)) {
        run.ending = { type: "lose", reason: "stamina" };
        return { ok: false, ending: run.ending };
      }
      return { ok: false, error: "Drink something before you shove off." };
    }
    run.holeIndex += 1;
    enterHole(run, rng);
    return { ok: true };
  }

  function callIt(run) {
    if (run.ending) return { ok: false, error: "The run is over." };
    run.ending = { type: "lose", reason: "stamina" };
    return { ok: true, ending: run.ending };
  }

  function endBlurb(run) {
    if (run.ending?.type === "win") {
      if (run.characterId === "matty") return "Matty noticed the tiny detail. It weighed more than the six-pack.";
      if (run.characterId === "bagel") return "The mustache did not twitch. It had already decided.";
      return "The eagle screams once. Hake offers the river a bite of sandwich. The river declines. The sandwich remains.";
    }
    if (run.ending?.reason === "line") {
      if (run.characterId === "hake") return "The line goes slack. The eagle circles the ripple. The sandwich is still with Hake.";
      if (run.characterId === "matty") return "The line snaps. Even Matty cannot notice a fish that already left.";
      return "The line snaps. Bagel's mustache droops, which is rare and serious.";
    }
    if (run.characterId === "matty") return "The Beer is gone and so is the afternoon. Matty tips the cowboy hat and sits.";
    if (run.characterId === "bagel") return "No Beer, no stamina, and the wacky worms stay in the box. Bagel naps on the bank.";
    return "Hake sits. The eagle lands. They consider the sandwich, which is immediately a sandwich again.";
  }

  function fishLabel(fish) {
    if (fish.known) return fish.name;
    if (fish.tier === "small") return "A small shape";
    if (fish.tier === "medium") return "A heavy shape";
    if (fish.tier === "large") return "A lunker shadow";
    return "A vast shape";
  }

  function tierLabel(tier) {
    if (tier === "large") return "Lunker";
    if (tier === "legendary") return "Legendary";
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  }

  return {
    COLORS,
    CHARACTERS,
    HOLES,
    SPECIES,
    PRICES,
    EAGLE_SAVE,
    createRng,
    characterById,
    colorById,
    colorName,
    note,
    createRun,
    hasSandwich,
    canRecover,
    isExhausted,
    totalWeight,
    drinkBeer,
    biteSandwich,
    scoutHole,
    castAt,
    resolveHook,
    leaveForShop,
    priceOf,
    buy,
    shoveOff,
    callIt,
    endBlurb,
    fishLabel,
    tierLabel,
  };
});
