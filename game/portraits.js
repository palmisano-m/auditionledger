/**
 * Sticker portraits for the three anglers.
 * Matty: cowboy hat. Bagel: mustache. Hake: silver chain, sandwich, eagle.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.WackyPortraits = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const LABELS = {
    matty: "Matty Tiny Detail Noticer wearing a cowboy hat and holding a beer",
    bagel: "Bagel with a large mustache and wacky-colored worms in his pocket",
    hake: "Hake wearing a silver chain and holding a sandwich, with an eagle companion",
  };

  function eagleShapes() {
    return `
      <g class="eagle">
        <ellipse class="wing left" cx="16" cy="30" rx="24" ry="10" fill="#6e4b2c" stroke="#1c2430" stroke-width="3"/>
        <ellipse class="wing right" cx="78" cy="30" rx="24" ry="10" fill="#6e4b2c" stroke="#1c2430" stroke-width="3"/>
        <ellipse cx="48" cy="36" rx="20" ry="15" fill="#8d6240" stroke="#1c2430" stroke-width="3"/>
        <circle cx="62" cy="26" r="11" fill="#f7f4ec" stroke="#1c2430" stroke-width="3"/>
        <circle cx="66" cy="25" r="2.4" fill="#1c2430"/>
        <path d="M71 28 L90 34 L71 40 Z" fill="#e6b34d" stroke="#1c2430" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M30 40 L14 46 L30 48 Z" fill="#6e4b2c" stroke="#1c2430" stroke-width="2.5" stroke-linejoin="round"/>
      </g>`;
  }

  function eagleMarkup() {
    return `<svg class="eagle-svg" viewBox="0 0 104 70" aria-hidden="true">${eagleShapes()}</svg>`;
  }

  function sandwichIcon() {
    return `
      <svg class="sandwich-icon" viewBox="0 0 72 52" aria-hidden="true">
        <ellipse cx="36" cy="16" rx="28" ry="10" fill="#f0d2a0" stroke="#1c2430" stroke-width="3"/>
        <rect x="10" y="16" width="52" height="8" rx="2" fill="#6ea23a" stroke="#1c2430" stroke-width="2"/>
        <rect x="10" y="23" width="52" height="6" fill="#e15a3a" stroke="#1c2430" stroke-width="2"/>
        <ellipse cx="36" cy="34" rx="28" ry="10" fill="#f6e0b8" stroke="#1c2430" stroke-width="3"/>
        <line x1="36" y1="8" x2="44" y2="0" stroke="#6b4226" stroke-width="3" stroke-linecap="round"/>
        <circle cx="44" cy="0" r="4" fill="#d4532b" stroke="#1c2430" stroke-width="2"/>
      </svg>`;
  }

  function portraitMarkup(id, opts) {
    const options = opts || {};
    const withEagle = options.eagle !== false && id === "hake";
    const labeled = options.label !== false;
    const label = LABELS[id] || "Angler";
    const open = labeled
      ? `<svg class="portrait portrait-${id}" viewBox="0 0 300 400" role="img" aria-label="${label}">`
      : `<svg class="portrait portrait-${id}" viewBox="0 0 300 400" aria-hidden="true">`;

    return `${open}
      <ellipse cx="150" cy="378" rx="78" ry="12" fill="rgba(20,30,30,0.18)"/>
      ${body(id)}
      ${arms()}
      ${id === "matty" ? "" : hair(id)}
      ${face(id)}
      ${id === "matty" ? hat() : ""}
      ${id === "bagel" ? mustache() : ""}
      ${id === "hake" ? chain() : ""}
      ${prop(id)}
      ${rod()}
      ${withEagle ? `<g transform="translate(196,8)">${eagleShapes()}</g>` : ""}
    </svg>`;
  }

  function arms() {
    return `
      <line x1="96" y1="214" x2="52" y2="274" stroke="#1c2430" stroke-width="22" stroke-linecap="round"/>
      <line x1="96" y1="214" x2="52" y2="274" stroke="#f6c7a4" stroke-width="14" stroke-linecap="round"/>
      <line x1="204" y1="214" x2="236" y2="262" stroke="#1c2430" stroke-width="22" stroke-linecap="round"/>
      <line x1="204" y1="214" x2="236" y2="262" stroke="#f6c7a4" stroke-width="14" stroke-linecap="round"/>`;
  }

  function body(id) {
    const shirt = id === "matty" ? "#3e74b0" : id === "bagel" ? "#f0c85a" : "#2f7c84";
    const vest = id === "matty"
      ? `<path d="M112 204 L150 258 L188 204 L184 312 L116 312 Z" fill="#e2c48a" stroke="#1c2430" stroke-width="4" stroke-linejoin="round"/>
         <path d="M132 196 L150 230 L168 196" fill="#d4532b" stroke="#1c2430" stroke-width="4" stroke-linejoin="round"/>`
      : "";
    const pocket = id === "bagel"
      ? `<rect x="116" y="248" width="68" height="36" rx="6" fill="#e0b03a" stroke="#1c2430" stroke-width="3"/>
         <path d="M128 248 C 122 228, 138 220, 132 204" fill="none" stroke="#7a3ff2" stroke-width="6" stroke-linecap="round"/>
         <path d="M150 246 C 158 226, 144 214, 160 200" fill="none" stroke="#ff6a00" stroke-width="6" stroke-linecap="round"/>
         <path d="M170 248 C 178 228, 164 216, 176 202" fill="none" stroke="#3ecf6e" stroke-width="6" stroke-linecap="round"/>
         <path d="M140 248 C 136 230, 150 222, 146 210" fill="none" stroke="#e0a106" stroke-width="5" stroke-linecap="round"/>`
      : "";
    return `
      <rect x="112" y="308" width="28" height="58" rx="10" fill="#2c3d55" stroke="#1c2430" stroke-width="4"/>
      <rect x="160" y="308" width="28" height="58" rx="10" fill="#2c3d55" stroke="#1c2430" stroke-width="4"/>
      <rect x="104" y="354" width="42" height="16" rx="6" fill="#3a2a22" stroke="#1c2430" stroke-width="4"/>
      <rect x="156" y="354" width="42" height="16" rx="6" fill="#3a2a22" stroke="#1c2430" stroke-width="4"/>
      <path d="M82 196 Q150 172 218 196 L206 318 L94 318 Z" fill="${shirt}" stroke="#1c2430" stroke-width="4" stroke-linejoin="round"/>
      ${vest}
      ${pocket}`;
  }

  function hair(id) {
    if (id === "hake") {
      return `<path d="M104 118 Q108 62 150 56 Q196 62 198 120 Q176 90 150 88 Q122 90 104 118 Z" fill="#2c333c" stroke="#1c2430" stroke-width="4" stroke-linejoin="round"/>`;
    }
    return `<path d="M98 120 Q92 52 150 46 Q210 52 204 122 Q178 86 150 82 Q118 86 98 120 Z" fill="#5a3a24" stroke="#1c2430" stroke-width="4" stroke-linejoin="round"/>`;
  }

  function hat() {
    return `
      <ellipse cx="150" cy="108" rx="112" ry="18" fill="#6b3a1e" stroke="#1c2430" stroke-width="4"/>
      <path d="M108 104 L114 50 Q128 34 140 58 Q150 78 162 58 Q176 32 188 50 L196 104 Z" fill="#8d4e2a" stroke="#1c2430" stroke-width="4" stroke-linejoin="round"/>
      <path d="M116 86 H186" stroke="#c4492a" stroke-width="8" stroke-linecap="round"/>
      <path d="M132 56 Q150 70 168 56" fill="none" stroke="#5c3018" stroke-width="3" stroke-linecap="round"/>`;
  }

  function face(id) {
    const head = id === "bagel"
      ? `<ellipse cx="150" cy="148" rx="58" ry="60" fill="#f6c7a4" stroke="#1c2430" stroke-width="4"/>`
      : `<ellipse cx="150" cy="146" rx="52" ry="56" fill="#f6c7a4" stroke="#1c2430" stroke-width="4"/>`;
    const ears = `
      <ellipse cx="96" cy="150" rx="12" ry="16" fill="#f6c7a4" stroke="#1c2430" stroke-width="4"/>
      <ellipse cx="204" cy="150" rx="12" ry="16" fill="#f6c7a4" stroke="#1c2430" stroke-width="4"/>`;
    let features = "";
    if (id === "matty") {
      features = `
        <path d="M114 136 Q128 126 142 136" fill="none" stroke="#1c2430" stroke-width="4" stroke-linecap="round"/>
        <path d="M160 136 Q174 126 188 136" fill="none" stroke="#1c2430" stroke-width="4" stroke-linecap="round"/>
        <path d="M116 152 Q128 146 140 152" fill="none" stroke="#1c2430" stroke-width="4" stroke-linecap="round"/>
        <path d="M162 152 Q174 146 186 152" fill="none" stroke="#1c2430" stroke-width="4" stroke-linecap="round"/>
        <circle cx="128" cy="152" r="2.4" fill="#1c2430"/>
        <circle cx="174" cy="152" r="2.4" fill="#1c2430"/>
        <path d="M150 160 L144 172 L158 172" fill="none" stroke="#c4896a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M134 184 Q150 192 166 184" fill="none" stroke="#1c2430" stroke-width="3" stroke-linecap="round"/>`;
    } else if (id === "bagel") {
      features = `
        <ellipse cx="116" cy="162" rx="14" ry="9" fill="#f0a090"/>
        <ellipse cx="186" cy="162" rx="14" ry="9" fill="#f0a090"/>
        <circle cx="126" cy="146" r="6.5" fill="#1c2430"/>
        <circle cx="176" cy="146" r="6.5" fill="#1c2430"/>
        <circle cx="128" cy="144" r="2.2" fill="#fff"/>
        <circle cx="178" cy="144" r="2.2" fill="#fff"/>
        <path d="M150 156 L146 168 L156 168" fill="none" stroke="#c4896a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    } else {
      features = `
        <ellipse cx="128" cy="146" rx="7" ry="8" fill="#1c2430"/>
        <ellipse cx="176" cy="146" rx="7" ry="8" fill="#1c2430"/>
        <circle cx="130" cy="144" r="2.2" fill="#fff"/>
        <circle cx="178" cy="144" r="2.2" fill="#fff"/>
        <path d="M150 156 L145 168 L157 168" fill="none" stroke="#c4896a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M134 180 Q150 190 166 180" fill="none" stroke="#1c2430" stroke-width="3" stroke-linecap="round"/>`;
    }
    return `${ears}${head}${features}`;
  }

  function mustache() {
    return `
      <path d="M88 172
               C 70 172, 54 194, 66 214
               C 84 196, 116 184, 150 182
               C 184 184, 216 196, 234 214
               C 246 194, 230 172, 212 172
               C 192 196, 170 206, 150 198
               C 130 206, 108 196, 88 172 Z"
            fill="#3a2414" stroke="#1c2430" stroke-width="4" stroke-linejoin="round"/>`;
  }

  function chain() {
    return `
      <path d="M118 210 Q150 258 182 210" fill="none" stroke="#9aa8b8" stroke-width="10" stroke-linecap="round"/>
      <path d="M118 210 Q150 258 182 210" fill="none" stroke="#f7fbff" stroke-width="5" stroke-linecap="round"/>
      <g fill="#f7fbff" stroke="#1c2430" stroke-width="2.5">
        <ellipse cx="124" cy="218" rx="7" ry="9"/>
        <ellipse cx="136" cy="232" rx="7" ry="9"/>
        <ellipse cx="150" cy="242" rx="7" ry="9"/>
        <ellipse cx="164" cy="232" rx="7" ry="9"/>
        <ellipse cx="176" cy="218" rx="7" ry="9"/>
      </g>
      <circle cx="150" cy="264" r="12" fill="#f4f7fb" stroke="#1c2430" stroke-width="3"/>
      <circle cx="150" cy="264" r="5" fill="#d5dee8" stroke="#1c2430" stroke-width="2"/>`;
  }

  function prop(id) {
    if (id === "matty") {
      return `
        <g transform="translate(18,248)">
          <path d="M16 18 Q32 -2 48 18" fill="#f7f4ec" stroke="#1c2430" stroke-width="3"/>
          <rect x="12" y="18" width="40" height="52" rx="6" fill="#e7edf4" stroke="#1c2430" stroke-width="4"/>
          <rect x="12" y="34" width="40" height="12" fill="#e6b34d" stroke="#1c2430" stroke-width="2"/>
        </g>`;
    }
    if (id === "hake") {
      return `
        <g transform="translate(4,250) rotate(-8)">
          <ellipse cx="46" cy="16" rx="40" ry="14" fill="#f0d2a0" stroke="#1c2430" stroke-width="4"/>
          <rect x="10" y="18" width="72" height="10" rx="2" fill="#6ea23a" stroke="#1c2430" stroke-width="3"/>
          <rect x="10" y="27" width="72" height="8" fill="#e15a3a" stroke="#1c2430" stroke-width="3"/>
          <ellipse cx="46" cy="40" rx="40" ry="14" fill="#f6e0b8" stroke="#1c2430" stroke-width="4"/>
          <line x1="46" y1="6" x2="56" y2="-10" stroke="#6b4226" stroke-width="3" stroke-linecap="round"/>
          <circle cx="56" cy="-12" r="6" fill="#d4532b" stroke="#1c2430" stroke-width="2"/>
        </g>`;
    }
    return "";
  }

  function rod() {
    return `
      <line x1="228" y1="250" x2="288" y2="156" stroke="#6a4328" stroke-width="6" stroke-linecap="round"/>
      <line x1="286" y1="158" x2="294" y2="196" stroke="#d5dee8" stroke-width="2"/>
      <circle cx="294" cy="200" r="5" fill="#e23b3b" stroke="#1c2430" stroke-width="2"/>`;
  }

  return { portraitMarkup, eagleMarkup, sandwichIcon, eagleShapes };
});
