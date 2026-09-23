(() => {
  "use strict";

  const W = window.WackyWater;
  const P = window.WackyPortraits;
  const BEST_KEY = "wacky-water-best-v1";

  const ui = {
    screen: "title",
    run: null,
    rng: null,
    armedColor: null,
    hook: null,
    note: "",
    best: null,
    newBest: false,
    abandonArmed: false,
  };

  let hookFrame = 0;
  const app = document.getElementById("app");

  function esc(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[ch]));
  }

  function loadBest() {
    try {
      const raw = localStorage.getItem(BEST_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data.weight !== "number") return null;
      return data;
    } catch (err) {
      return null;
    }
  }

  function considerBest() {
    const weight = W.totalWeight(ui.run);
    if (weight > (ui.best?.weight || 0)) {
      const character = W.characterById(ui.run.characterId);
      ui.best = {
        weight,
        characterId: ui.run.characterId,
        name: character.name,
        win: ui.run.ending?.type === "win",
      };
      ui.newBest = true;
      try {
        localStorage.setItem(BEST_KEY, JSON.stringify(ui.best));
      } catch (err) {
        /* The cooler still counts if storage is blocked. */
      }
    } else {
      ui.newBest = false;
    }
  }

  function pips(value, max) {
    let html = '<span class="pips" aria-hidden="true">';
    for (let i = 0; i < max; i += 1) html += `<i class="${i < value ? "on" : ""}"></i>`;
    return html + "</span>";
  }

  function say(text) {
    W.note(ui.run, text);
    ui.note = text;
  }

  function syncNote() {
    ui.note = ui.run.log[ui.run.log.length - 1] || "";
  }

  function portrait(id, opts) {
    return P.portraitMarkup(id, opts);
  }

  function render() {
    document.body.dataset.character = ui.run?.characterId || "";
    if (ui.screen === "title") app.innerHTML = titleHtml();
    else if (ui.screen === "end") app.innerHTML = endHtml();
    else app.innerHTML = playHtml();
  }

  function titleHtml() {
    const best = ui.best
      ? `Best cooler: ${ui.best.weight.toFixed(1)} lb (${esc(ui.best.name)})`
      : "No cooler weighed yet.";
    const cards = W.CHARACTERS.map((character) => {
      return `
        <button type="button" class="angler" data-action="start" data-character="${character.id}">
          <div class="portrait-frame">${portrait(character.id, { label: false })}</div>
          <h2>${esc(character.name)}</h2>
          <p class="look">${esc(character.look)}</p>
          <p class="perk">${esc(character.perk)}</p>
          <span class="tag">${esc(character.tag)}</span>
          <span class="start-label">Fish as ${esc(character.short)}</span>
        </button>`;
    }).join("");

    return `
      <main class="title-screen">
        <p class="eyebrow">a fishing roguelike</p>
        <h1 class="logo">Wacky Water</h1>
        <p class="lede">Three anglers. One river. Bring worms. Land The Old Detail before the line, the Beer, or the afternoon gives out.</p>
        <div class="hero" aria-hidden="true">
          <div class="hill hill-a"></div>
          <div class="hill hill-b"></div>
          <div class="orb"></div>
          <div class="water"></div>
          <div class="dock"></div>
          <div class="hero-figure matty">${portrait("matty", { label: false })}</div>
          <div class="hero-figure bagel">${portrait("bagel", { label: false })}</div>
          <div class="hero-figure hake">${portrait("hake", { label: false, eagle: true })}</div>
        </div>
        <h2 class="section-label on-dark">Choose an angler</h2>
        <div class="roster">${cards}</div>
        <section class="rules-panel">
          <h2>How a run works</h2>
          <ol class="rules">
            <li>Arm a worm, then cast at a shape in the water.</li>
            <li>If the color is right, set the hook while the bobber sits in the green.</li>
            <li>Beer brings stamina back and widens that green for one cast.</li>
            <li>Spend tales at the floating dock between holes. Catch The Old Detail to win.</li>
          </ol>
        </section>
        <p class="best">${best}</p>
      </main>`;
  }

  function sceneHtml(run) {
    const pads = run.holeIndex === 1 ? '<div class="pad"></div><div class="pad pad-b"></div>' : "";
    const eagle = run.characterId === "hake"
      ? `<div class="sky-eagle">${P.eagleMarkup()}</div>`
      : "";
    let cans = "";
    if (run.beer > 0) {
      cans = '<div class="sixpack" aria-hidden="true">';
      for (let i = 0; i < run.beer; i += 1) cans += '<span class="can"></span>';
      cans += "</div>";
    }
    return `
      <div class="scene" data-hole="${run.holeIndex}">
        <div class="hill hill-a"></div>
        <div class="hill hill-b"></div>
        <div class="orb"></div>
        ${eagle}
        <div class="water"></div>
        ${pads}
        <div class="dock"></div>
        <div class="figure">${portrait(run.characterId, { label: false, eagle: false })}</div>
        ${cans}
      </div>`;
  }

  function statsHtml(run) {
    const character = W.characterById(run.characterId);
    const steady = run.steady ? '<span class="stat steady"><span class="stat-label">Hands</span><span class="stat-value">Steady</span></span>' : "";
    const sandwich = W.hasSandwich(run)
      ? `<span class="stat sandwich-stat"><span class="stat-label">Sandwich</span><span class="stat-value">${P.sandwichIcon()} With him</span></span>`
      : "";
    return `
      <header class="hud">
        <div class="hud-portrait portrait-frame">${portrait(run.characterId, { eagle: true })}</div>
        <div class="hud-copy">
          <p class="wordmark">Wacky Water</p>
          <h1>${esc(character.name)}</h1>
          <p class="look">${esc(character.look)}</p>
          <div class="stats">
            <span class="stat"><span class="stat-label">Beer</span><span class="stat-value">${run.beer}</span></span>
            <span class="stat"><span class="stat-label">Stamina</span><span class="stat-value">${run.stamina}/${run.maxStamina}</span>${pips(run.stamina, run.maxStamina)}</span>
            <span class="stat"><span class="stat-label">Line</span><span class="stat-value">${run.line}/${run.maxLine}</span>${pips(run.line, run.maxLine)}</span>
            <span class="stat"><span class="stat-label">Tales</span><span class="stat-value">${run.tales}</span></span>
            ${sandwich}
            ${steady}
          </div>
        </div>
      </header>`;
  }

  function holeHead(run) {
    const dots = W.HOLES.map((_, i) => {
      const cls = i === run.holeIndex ? "now" : i < run.holeIndex ? "done" : "";
      return `<span class="dot ${cls}"></span>`;
    }).join("");
    return `
      <div class="hole-head">
        <div>
          <p class="kicker">Hole ${run.holeIndex + 1} of ${W.HOLES.length}</p>
          <h2>${esc(run.hole.name)}</h2>
        </div>
        <div class="dots" aria-hidden="true">${dots}</div>
      </div>`;
  }

  function fishCards(run) {
    const open = run.hole.fish.filter((fish) => !fish.caught);
    if (!open.length) {
      return '<p class="empty-hole">The hole is quiet. Walk on while you still can.</p>';
    }
    const armed = ui.armedColor ? W.colorById(ui.armedColor) : null;
    return `<div class="fish-row">${open.map((fish) => {
      const favorite = fish.revealed ? esc(W.colorName(fish.favorite)) : "???";
      const ruled = fish.ruledOut.length
        ? `<span class="ruled">Ruled out: ${fish.ruledOut.map((id) => esc(W.colorName(id))).join(", ")}</span>`
        : "";
      const cast = armed
        ? `Cast ${esc(armed.name)}`
        : "Arm a worm first";
      return `
        <button type="button" class="fish-card ${fish.tier}" data-action="cast" data-fish="${fish.uid}">
          <span class="tier">${esc(W.tierLabel(fish.tier))}</span>
          <strong>${esc(W.fishLabel(fish))}</strong>
          <span class="hint">${esc(fish.hint)}</span>
          <span class="fav">Favorite: ${favorite}</span>
          ${ruled}
          <span class="cast-label">${cast}</span>
        </button>`;
    }).join("")}</div>`;
  }

  function wormButton(color, mode) {
    const count = ui.run.worms[color.id] || 0;
    const buying = mode === "buy";
    const price = buying ? W.priceOf(ui.run, color.wacky ? "wacky" : "worm") : 0;
    const disabled = buying
      ? ui.run.tales < price || count >= 9
      : count <= 0;
    const pressed = !buying && ui.armedColor === color.id;
    const detail = buying ? `${count} · ${price} tales` : String(count);
    return `
      <button type="button" class="worm${color.wacky ? " wacky" : ""}" data-action="${buying ? "buy" : "arm"}" data-kind="${color.wacky ? "wacky" : "worm"}" data-color="${color.id}" aria-pressed="${pressed ? "true" : "false"}"${disabled ? " disabled" : ""}>
        <span class="swatch ${color.id}" aria-hidden="true"></span>
        <span class="worm-name">${esc(color.name)}</span>
        <span class="worm-count">${esc(detail)}</span>
      </button>`;
  }

  function tackleHtml(mode) {
    const basic = W.COLORS.filter((color) => !color.wacky).map((color) => wormButton(color, mode)).join("");
    const wacky = W.COLORS.filter((color) => color.wacky).map((color) => wormButton(color, mode)).join("");
    const bagel = ui.run.characterId === "bagel";
    const wackyNote = mode === "buy"
      ? (bagel ? "Bagel price on every wacky color." : "Wacky worms cost more if you did not bring them.")
      : (bagel ? "Bonus colors, packed from the first cast." : "Empty until the dock sells you one.");
    const basicLabel = mode === "buy" ? "Worms — 4 tales" : "Worms";
    return `
      <section class="panel">
        <h2 class="section-label">${basicLabel}</h2>
        <div class="worms">${basic}</div>
        <div class="wacky-box">
          <h2 class="section-label">Wacky worms</h2>
          <p class="hint">${wackyNote}</p>
          <div class="worms">${wacky}</div>
        </div>
      </section>`;
  }

  function actionsHtml(run) {
    const abandon = ui.abandonArmed ? "Really change angler?" : "Change angler";
    const drink = `<button type="button" class="btn" data-action="drink"${run.beer < 1 ? " disabled" : ""}>Drink a Beer (${run.beer})</button>`;
    let special = "";
    if (run.characterId === "hake") {
      special += `<button type="button" class="btn" data-action="scout"${run.scouted ? " disabled" : ""}>Send the eagle</button>`;
      special += `<button type="button" class="btn" data-action="sandwich"${run.sandwichBiteUsed ? " disabled" : ""}>${run.sandwichBiteUsed ? "Sandwich stays" : "Take a sandwich bite"}</button>`;
    }
    let travel = "";
    if (run.holeIndex < W.HOLES.length - 1) {
      travel = '<button type="button" class="btn primary" data-action="leave">Walk to the dock</button>';
    }
    const call = W.isExhausted(run)
      ? '<button type="button" class="btn" data-action="call">Call the run</button>'
      : "";
    const keys = run.characterId === "hake"
      ? "Keys: B drinks a Beer, E sends the eagle, S bites the sandwich, Space sets the hook."
      : "Keys: B drinks a Beer, Space sets the hook.";
    return `
      <div class="actions">
        ${drink}
        ${special}
        ${travel}
        ${call}
        <button type="button" class="btn ghost" data-action="abandon">${abandon}</button>
      </div>
      <p class="keys">${keys}</p>`;
  }

  function shopHtml(run) {
    const next = W.HOLES[run.holeIndex + 1];
    const mendDisabled = run.tales < W.priceOf(run, "mend") || run.line >= run.maxLine;
    const beerDisabled = run.tales < W.priceOf(run, "beer");
    return `
      <section class="panel">
        <div class="shop-head">
          <h2>The Floating Dock</h2>
          <p><strong>${run.tales}</strong> tales</p>
        </div>
        <p>Stock the box, mend the line, then shove off for ${esc(next.name)}.</p>
        <div class="actions">
          <button type="button" class="btn" data-action="buy" data-kind="beer"${beerDisabled ? " disabled" : ""}>Buy Beer — ${W.PRICES.beer} tales</button>
          <button type="button" class="btn" data-action="buy" data-kind="mend"${mendDisabled ? " disabled" : ""}>Mend the line — ${W.PRICES.mend} tales</button>
        </div>
      </section>
      ${tackleHtml("buy")}
      <div class="actions">
        <button type="button" class="btn" data-action="shop-back">Keep fishing</button>
        <button type="button" class="btn primary" data-action="shove">Shove off</button>
      </div>`;
  }

  function coolerHtml(run) {
    if (!run.cooler.length) return "";
    const items = run.cooler.map((fish) => `<li>${esc(fish.name)} — ${fish.weight.toFixed(1)} lb</li>`).join("");
    return `
      <details class="cooler">
        <summary>Cooler · ${W.totalWeight(run).toFixed(1)} lb · ${run.cooler.length} fish</summary>
        <ul>${items}</ul>
      </details>`;
  }

  function hookHtml() {
    const hook = ui.hook;
    if (!hook) return "";
    const steady = hook.steady ? " Steady hands widened the green." : "";
    return `
      <div class="hook-overlay">
        <div class="hook-card" role="dialog" aria-modal="true" aria-labelledby="hook-title">
          <h2 id="hook-title">Set the hook</h2>
          <p>${esc(hook.name)} is on.${steady} Click the bar, or press Space, when the bobber sits in the green.</p>
          <div class="track" data-action="set-hook">
            <div class="zone" style="left:${hook.zoneStart * 100}%;width:${hook.zoneWidth * 100}%"></div>
            <div class="bobber" style="left:${hook.pos * 100}%"></div>
          </div>
          <button type="button" class="btn primary" data-action="set-hook">Set the hook</button>
        </div>
      </div>`;
  }

  function playHtml() {
    const run = ui.run;
    const middle = ui.screen === "shop" ? shopHtml(run) : `${fishCards(run)}${tackleHtml("arm")}${actionsHtml(run)}`;
    return `
      <main class="play">
        ${statsHtml(run)}
        ${holeHead(run)}
        ${sceneHtml(run)}
        <p class="blurb">${esc(run.hole.blurb)}</p>
        <p class="note" role="status">${esc(ui.note)}</p>
        ${middle}
        ${coolerHtml(run)}
        <ol class="log">${run.log.map((line) => `<li>${esc(line)}</li>`).join("")}</ol>
        ${hookHtml()}
      </main>`;
  }

  function endHtml() {
    const run = ui.run;
    const win = run.ending?.type === "win";
    const character = W.characterById(run.characterId);
    const catches = run.cooler.length
      ? `<ul class="catch-list">${run.cooler.map((fish) => `<li>${esc(fish.name)} — ${fish.weight.toFixed(1)} lb, ${fish.tales} tales</li>`).join("")}</ul>`
      : "<p>The cooler is empty.</p>";
    const banner = ui.newBest ? '<p class="new-best">New best cooler</p>' : "";
    return `
      <main class="end-screen">
        <article class="end-card">
          ${banner}
          <p class="kicker" style="color:#5c5144">${win ? "Landed" : "Skunked"}</p>
          <h2 class="outcome">${win ? "The Old Detail is in the cooler." : "The river keeps the rest."}</h2>
          <div class="end-portrait portrait-frame">${portrait(run.characterId, { eagle: true })}</div>
          <p>${esc(W.endBlurb(run))}</p>
          <p class="scoreline"><strong>${W.totalWeight(run).toFixed(1)} lb</strong> in the cooler · ${run.tales} tales left · ${esc(character.name)}</p>
          ${catches}
          <div class="end-actions">
            <button type="button" class="btn primary" data-action="retry" data-character="${run.characterId}">Fish again as ${esc(character.short)}</button>
            <button type="button" class="btn" data-action="again">Choose another angler</button>
          </div>
        </article>
      </main>`;
  }

  function start(characterId) {
    cancelAnimationFrame(hookFrame);
    ui.rng = W.createRng();
    ui.run = W.createRun(characterId, ui.rng);
    ui.armedColor = null;
    ui.hook = null;
    ui.screen = "hole";
    ui.abandonArmed = false;
    ui.newBest = false;
    syncNote();
    render();
  }

  function finish() {
    cancelAnimationFrame(hookFrame);
    ui.hook = null;
    ui.screen = "end";
    considerBest();
    render();
  }

  function drink() {
    const res = W.drinkBeer(ui.run);
    if (!res.ok) {
      say(res.error);
      render();
      return;
    }
    say(res.gained > 0 ? "A Beer. Hands go steady, and stamina comes back." : "A Beer for steady hands. Stamina was already full.");
    render();
  }

  function sandwich() {
    const res = W.biteSandwich(ui.run);
    if (!res.ok) {
      say(res.error);
      render();
      return;
    }
    say("Hake takes a bite. The sandwich is still with him. It always is.");
    render();
  }

  function scout() {
    const res = W.scoutHole(ui.run);
    if (!res.ok) {
      say(res.error);
      render();
      return;
    }
    say("The eagle climbs, circles once, and tells Hake every favorite color.");
    render();
  }

  function cast(fishUid) {
    if (!ui.armedColor) {
      say("Arm a worm first.");
      render();
      return;
    }
    const res = W.castAt(ui.run, fishUid, ui.armedColor);
    if (!res.ok) {
      say(res.error);
      render();
      return;
    }
    if (!ui.run.worms[ui.armedColor]) ui.armedColor = null;
    if (res.type === "nobite") {
      say(`${res.fish.name} ignores the ${W.colorName(res.colorId)} worm. That color is ruled out.`);
      render();
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const speeds = { small: 0.55, medium: 0.78, large: 0.98, legendary: 1.18 };
    ui.hook = {
      fishUid: res.fish.uid,
      name: res.fish.name,
      zoneStart: 0.05 + Math.random() * Math.max(0.08, 0.9 - res.zoneWidth),
      zoneWidth: res.zoneWidth,
      pos: 0,
      dir: 1,
      speed: (speeds[res.fish.tier] || 0.8) * (reduced ? 0.45 : 1),
      last: 0,
      resolved: false,
      steady: res.steady,
    };
    const lead = res.steady ? "Steady hands. " : "";
    say(`${lead}${res.fish.name} takes the ${W.colorName(res.colorId)} worm. Set the hook.`);
    render();
    const button = document.querySelector("[data-action='set-hook'].btn");
    if (button) button.focus();
    hookFrame = requestAnimationFrame(tickHook);
  }

  function tickHook(now) {
    if (!ui.hook || ui.hook.resolved) return;
    if (!ui.hook.last) ui.hook.last = now;
    const dt = Math.min(0.04, (now - ui.hook.last) / 1000);
    ui.hook.last = now;
    ui.hook.pos += ui.hook.dir * ui.hook.speed * dt;
    if (ui.hook.pos >= 1) {
      ui.hook.pos = 1;
      ui.hook.dir = -1;
    } else if (ui.hook.pos <= 0) {
      ui.hook.pos = 0;
      ui.hook.dir = 1;
    }
    const bobber = document.querySelector(".bobber");
    if (bobber) bobber.style.left = `${ui.hook.pos * 100}%`;
    hookFrame = requestAnimationFrame(tickHook);
  }

  function setHook() {
    if (!ui.hook || ui.hook.resolved) return;
    ui.hook.resolved = true;
    cancelAnimationFrame(hookFrame);
    const hit = ui.hook.pos >= ui.hook.zoneStart && ui.hook.pos <= ui.hook.zoneStart + ui.hook.zoneWidth;
    const fishUid = ui.hook.fishUid;
    ui.hook = null;
    const res = W.resolveHook(ui.run, fishUid, hit, ui.rng);
    if (!res.ok) {
      say(res.error);
      render();
      return;
    }
    if (res.caught && res.eagle) {
      say(`The eagle snatches the ${res.fish.name} (${res.fish.weight.toFixed(1)} lb) and drops it in the cooler.`);
    } else if (res.caught) {
      say(`${res.fish.name} — ${res.fish.weight.toFixed(1)} lb — thumps into the cooler.`);
    } else if (res.snapped) {
      say("Missed. The line snaps.");
    } else if (res.lineDamage) {
      say(`Missed. ${res.fish.name} frays the line and runs.`);
    } else {
      say(`Missed. ${res.fish.name} slips off.`);
    }
    if (ui.run.ending) {
      finish();
      return;
    }
    render();
  }

  function leave() {
    const res = W.leaveForShop(ui.run);
    if (!res.ok) {
      if (res.ending) finish();
      else {
        say(res.error);
        render();
      }
      return;
    }
    ui.screen = "shop";
    say("The floating dock knocks against the boat.");
    render();
  }

  function shove() {
    const res = W.shoveOff(ui.run, ui.rng);
    if (!res.ok) {
      if (res.ending) finish();
      else {
        say(res.error);
        render();
      }
      return;
    }
    ui.screen = "hole";
    ui.armedColor = ui.armedColor && ui.run.worms[ui.armedColor] ? ui.armedColor : null;
    syncNote();
    render();
  }

  function buy(kind, colorId) {
    const res = W.buy(ui.run, kind, colorId);
    if (!res.ok) {
      say(res.error);
      render();
      return;
    }
    if (kind === "beer") say("The dock slides over another Beer.");
    else if (kind === "mend") say("The line is mended.");
    else say(`A ${W.colorName(colorId)} worm joins the box.`);
    render();
  }

  function onClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target || !app.contains(target)) return;
    const action = target.dataset.action;
    if (ui.hook && action !== "set-hook") return;
    if (action !== "abandon") ui.abandonArmed = false;

    if (action === "start" || action === "retry") start(target.dataset.character);
    else if (action === "again") {
      ui.screen = "title";
      ui.run = null;
      ui.hook = null;
      render();
    } else if (action === "arm") {
      ui.armedColor = target.dataset.color;
      render();
    } else if (action === "cast") cast(target.dataset.fish);
    else if (action === "drink") drink();
    else if (action === "sandwich") sandwich();
    else if (action === "scout") scout();
    else if (action === "leave") leave();
    else if (action === "shop-back") {
      ui.screen = "hole";
      render();
    } else if (action === "shove") shove();
    else if (action === "buy") buy(target.dataset.kind, target.dataset.color);
    else if (action === "set-hook") setHook();
    else if (action === "call") {
      const res = W.callIt(ui.run);
      if (res.ending) finish();
    } else if (action === "abandon") {
      if (!ui.abandonArmed) {
        ui.abandonArmed = true;
        render();
        return;
      }
      cancelAnimationFrame(hookFrame);
      ui.hook = null;
      ui.run = null;
      ui.screen = "title";
      ui.abandonArmed = false;
      render();
    }
  }

  function onKey(event) {
    if (ui.hook && (event.code === "Space" || event.code === "Enter")) {
      event.preventDefault();
      setHook();
      return;
    }
    if (!ui.run || ui.screen === "end" || ui.screen === "title" || ui.hook) return;
    const key = event.key.toLowerCase();
    if (key === "b") drink();
    else if (key === "e" && ui.run.characterId === "hake") scout();
    else if (key === "s" && ui.run.characterId === "hake") sandwich();
  }

  ui.best = loadBest();
  app.addEventListener("click", onClick);
  document.addEventListener("keydown", onKey);
  const requested = new URLSearchParams(location.search).get("as");
  if (requested && W.CHARACTERS.some((character) => character.id === requested)) start(requested);
  else render();
})();
