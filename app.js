(() => {
  "use strict";

  const STORAGE_KEY = "audition-ledger-v1";
  const STORE_VERSION = 3;
  const VOICE_TYPES = window.AuditionExport?.VOICE_TYPES || [
    "Soprano",
    "Mezzo-Soprano",
    "Countertenor",
    "Tenor",
    "Baritone",
    "Bass",
  ];

  /** @type {{ version: number, auditionGroups: Array, auditions: Array, activeAuditionId: string|null, activeGroupId: string|null }} */
  let state = {
    version: STORE_VERSION,
    auditionGroups: [],
    auditions: [],
    activeAuditionId: null,
    activeGroupId: null,
  };

  /** Roles being edited in the audition dialog (not yet saved). */
  let draftRoles = [];

  let ui = {
    view: "session", // session | all | byRole
    search: "",
    voiceFilter: "",
    sortBy: "number",
    openSingerId: null,
    editingAuditionId: null,
    confirmResolver: null,
  };

  const el = {
    viewSession: document.getElementById("view-session"),
    viewAll: document.getElementById("view-all"),
    viewByRole: document.getElementById("view-by-role"),
    menuBtn: document.getElementById("menu-btn"),
    menuPanel: document.getElementById("menu-panel"),
    actionExport: document.getElementById("action-export"),
    actionBackup: document.getElementById("action-backup"),
    actionRestore: document.getElementById("action-restore"),
    actionDeleteSession: document.getElementById("action-delete-session"),
    actionManageGroups: document.getElementById("action-manage-groups"),
    groupPanel: document.getElementById("group-panel"),
    groupFilter: document.getElementById("group-filter"),
    groupMeta: document.getElementById("group-meta"),
    manageGroupsBtn: document.getElementById("manage-groups-btn"),
    sessionPanel: document.getElementById("session-panel"),
    toolbarPanel: document.getElementById("toolbar-panel"),
    auditionSelect: document.getElementById("audition-select"),
    newAuditionBtn: document.getElementById("new-audition-btn"),
    editAuditionBtn: document.getElementById("edit-audition-btn"),
    sessionMeta: document.getElementById("session-meta"),
    searchInput: document.getElementById("search-input"),
    voiceFilter: document.getElementById("voice-filter"),
    sortBy: document.getElementById("sort-by"),
    sortField: document.getElementById("sort-field"),
    importExcelBtn: document.getElementById("import-excel-btn"),
    addSingerBtn: document.getElementById("add-singer-btn"),
    listTitle: document.getElementById("list-title"),
    listCount: document.getElementById("list-count"),
    singerList: document.getElementById("singer-list"),
    auditionDialog: document.getElementById("audition-dialog"),
    auditionForm: document.getElementById("audition-form"),
    auditionDialogTitle: document.getElementById("audition-dialog-title"),
    auditionName: document.getElementById("audition-name"),
    auditionDate: document.getElementById("audition-date"),
    auditionLocation: document.getElementById("audition-location"),
    auditionGroup: document.getElementById("audition-group"),
    rolesList: document.getElementById("roles-list"),
    roleAddInput: document.getElementById("role-add-input"),
    roleAddBtn: document.getElementById("role-add-btn"),
    groupsDialog: document.getElementById("groups-dialog"),
    groupsList: document.getElementById("groups-list"),
    groupAddInput: document.getElementById("group-add-input"),
    groupAddBtn: document.getElementById("group-add-btn"),
    singerDialog: document.getElementById("singer-dialog"),
    singerForm: document.getElementById("singer-form"),
    singerDialogTitle: document.getElementById("singer-dialog-title"),
    singerId: document.getElementById("singer-id"),
    singerAuditionId: document.getElementById("singer-audition-id"),
    singerNumber: document.getElementById("singer-number"),
    singerVoice: document.getElementById("singer-voice"),
    singerName: document.getElementById("singer-name"),
    singerRepertoire: document.getElementById("singer-repertoire"),
    singerNotes: document.getElementById("singer-notes"),
    singerRole: document.getElementById("singer-role"),
    singerScore: document.getElementById("singer-score"),
    deleteSingerBtn: document.getElementById("delete-singer-btn"),
    confirmDialog: document.getElementById("confirm-dialog"),
    confirmTitle: document.getElementById("confirm-title"),
    confirmMessage: document.getElementById("confirm-message"),
    confirmCancel: document.getElementById("confirm-cancel"),
    confirmOk: document.getElementById("confirm-ok"),
    restoreInput: document.getElementById("restore-input"),
    importExcelInput: document.getElementById("import-excel-input"),
    toast: document.getElementById("toast"),
  };

  function uid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function todayISO() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function showToast(message, isError = false) {
    el.toast.textContent = message;
    el.toast.classList.toggle("error", isError);
    el.toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.toast.classList.remove("show"), 3200);
  }

  function normalizeScore(value) {
    if (value == null || value === "") return null;
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > 10) return null;
    return n;
  }

  function normalizeRoles(rawRoles) {
    if (!Array.isArray(rawRoles)) return [];
    const seen = new Set();
    const roles = [];
    for (const role of rawRoles) {
      const text = String(role || "").trim();
      if (!text || seen.has(text.toLowerCase())) continue;
      seen.add(text.toLowerCase());
      roles.push(text);
    }
    return roles;
  }

  function persist() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: STORE_VERSION,
          auditionGroups: state.auditionGroups,
          auditions: state.auditions,
          activeAuditionId: state.activeAuditionId,
          activeGroupId: state.activeGroupId,
        })
      );
    } catch (err) {
      console.error(err);
      showToast("Could not save — storage may be full.", true);
    }
  }

  function normalizeSinger(s, j, i) {
    if (!s || typeof s !== "object") throw new Error(`Invalid singer at audition ${i}, index ${j}.`);
    return {
      id: String(s.id || uid()),
      number: s.number != null ? String(s.number) : "",
      name: s.name != null ? String(s.name) : "",
      voiceType: VOICE_TYPES.includes(s.voiceType) ? s.voiceType : "Soprano",
      repertoire: s.repertoire != null ? String(s.repertoire) : "",
      notes: s.notes != null ? String(s.notes) : "",
      roleConsidered: s.roleConsidered != null ? String(s.roleConsidered) : "",
      score: normalizeScore(s.score),
    };
  }

  function normalizeGroups(rawGroups) {
    if (!Array.isArray(rawGroups)) return [];
    return rawGroups
      .filter((g) => g && typeof g === "object")
      .map((g) => ({
        id: String(g.id || uid()),
        name: String(g.name || "Untitled Group").trim() || "Untitled Group",
        createdAt: String(g.createdAt || new Date().toISOString()),
      }));
  }

  function normalizeStore(raw) {
    if (!raw || typeof raw !== "object") throw new Error("Backup is not a valid object.");
    if (![1, 2, 3].includes(raw.version)) throw new Error("Unsupported backup version.");
    if (!Array.isArray(raw.auditions)) throw new Error("Backup is missing auditions.");

    const auditionGroups = normalizeGroups(raw.auditionGroups);
    const groupIds = new Set(auditionGroups.map((g) => g.id));

    const auditions = raw.auditions.map((a, i) => {
      if (!a || typeof a !== "object") throw new Error(`Invalid audition at index ${i}.`);
      const singers = Array.isArray(a.singers)
        ? a.singers.map((s, j) => normalizeSinger(s, j, i))
        : [];
      let groupId = a.groupId != null && a.groupId !== "" ? String(a.groupId) : null;
      if (groupId && !groupIds.has(groupId)) groupId = null;
      return {
        id: String(a.id || uid()),
        name: String(a.name || "Untitled Audition"),
        date: String(a.date || todayISO()),
        location: a.location != null ? String(a.location) : "",
        createdAt: String(a.createdAt || new Date().toISOString()),
        groupId,
        roles: normalizeRoles(a.roles),
        singers,
      };
    });

    let activeAuditionId = raw.activeAuditionId ? String(raw.activeAuditionId) : null;
    if (activeAuditionId && !auditions.some((a) => a.id === activeAuditionId)) {
      activeAuditionId = auditions[0]?.id || null;
    }

    let activeGroupId = raw.activeGroupId != null && raw.activeGroupId !== "" ? String(raw.activeGroupId) : null;
    if (activeGroupId && !groupIds.has(activeGroupId)) activeGroupId = null;

    return { version: STORE_VERSION, auditionGroups, auditions, activeAuditionId, activeGroupId };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        state = {
          version: STORE_VERSION,
          auditionGroups: [],
          auditions: [],
          activeAuditionId: null,
          activeGroupId: null,
        };
        return;
      }
      state = normalizeStore(JSON.parse(raw));
      persist();
    } catch (err) {
      console.error(err);
      state = {
        version: STORE_VERSION,
        auditionGroups: [],
        auditions: [],
        activeAuditionId: null,
        activeGroupId: null,
      };
      showToast("Saved data looked invalid — starting fresh.", true);
    }
  }

  function getActiveAudition() {
    return state.auditions.find((a) => a.id === state.activeAuditionId) || null;
  }

  function getActiveGroup() {
    if (!state.activeGroupId) return null;
    return state.auditionGroups.find((g) => g.id === state.activeGroupId) || null;
  }

  function getScopedAuditions() {
    if (!state.activeGroupId) return state.auditions;
    return state.auditions.filter((a) => a.groupId === state.activeGroupId);
  }

  function ensureActiveAudition() {
    const scoped = getScopedAuditions();
    if (!scoped.length) {
      if (!state.activeGroupId) state.activeAuditionId = null;
      else if (!scoped.some((a) => a.id === state.activeAuditionId)) state.activeAuditionId = null;
      return null;
    }
    if (!scoped.some((a) => a.id === state.activeAuditionId)) {
      state.activeAuditionId = scoped[0].id;
      persist();
    }
    return getActiveAudition();
  }

  function sortedGroups() {
    return [...state.auditionGroups].sort((a, b) =>
      String(a.name).localeCompare(String(b.name), undefined, { sensitivity: "base" })
    );
  }

  function groupName(groupId) {
    if (!groupId) return "Ungrouped";
    return state.auditionGroups.find((g) => g.id === groupId)?.name || "Ungrouped";
  }

  function nextAuditionNumber(audition) {
    let max = 0;
    for (const singer of audition.singers || []) {
      const n = parseInt(String(singer.number).replace(/[^\d]/g, ""), 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
    return String(max + 1);
  }

  function confirmDialog(title, message, okLabel = "Continue") {
    return new Promise((resolve) => {
      ui.confirmResolver = resolve;
      el.confirmTitle.textContent = title;
      el.confirmMessage.textContent = message;
      el.confirmOk.textContent = okLabel;
      openDialog(el.confirmDialog);
    });
  }

  function openDialog(dialog) {
    dialog.classList.add("open");
    const focusable = [...dialog.querySelectorAll("input, select, textarea, button")].find(
      (node) =>
        node.type !== "hidden" &&
        !node.disabled &&
        !node.classList.contains("hidden") &&
        node.offsetParent !== null
    );
    if (focusable) focusable.focus();
  }

  function closeDialog(dialog) {
    dialog.classList.remove("open");
  }

  function closeMenu() {
    el.menuPanel.classList.remove("open");
    el.menuBtn.setAttribute("aria-expanded", "false");
  }

  function formatDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return iso;
    try {
      return new Date(y, m - 1, d).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return iso;
    }
  }

  function formatScore(score) {
    return score == null ? "—" : String(score);
  }

  function compareValues(a, b, sortBy) {
    if (sortBy === "number") {
      const na = parseFloat(String(a.number).replace(/[^\d.-]/g, ""));
      const nb = parseFloat(String(b.number).replace(/[^\d.-]/g, ""));
      const aNum = Number.isFinite(na);
      const bNum = Number.isFinite(nb);
      if (aNum && bNum && na !== nb) return na - nb;
      if (aNum && !bNum) return -1;
      if (!aNum && bNum) return 1;
      return String(a.number).localeCompare(String(b.number), undefined, { numeric: true, sensitivity: "base" });
    }
    if (sortBy === "voiceType") {
      const ia = VOICE_TYPES.indexOf(a.voiceType);
      const ib = VOICE_TYPES.indexOf(b.voiceType);
      if (ia !== ib) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return compareValues(a, b, "number");
    }
    if (sortBy === "score") {
      const sa = a.score == null ? -1 : a.score;
      const sb = b.score == null ? -1 : b.score;
      if (sa !== sb) return sb - sa;
      return compareValues(a, b, "number");
    }
    const nameCmp = String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
    if (nameCmp !== 0) return nameCmp;
    return compareValues(a, b, "number");
  }

  function compareByScoreDesc(a, b) {
    return compareValues(a, b, "score");
  }

  function matchesSearch(singer, audition, query) {
    if (!query) return true;
    const hay = [
      singer.number,
      singer.name,
      singer.voiceType,
      singer.repertoire,
      singer.notes,
      singer.roleConsidered,
      singer.score == null ? "" : String(singer.score),
      audition?.name,
      audition?.date,
      audition?.location,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(query);
  }

  function getVisibleRows() {
    const query = ui.search.trim().toLowerCase();
    /** @type {Array<{singer: any, audition: any}>} */
    let rows = [];
    const scoped = getScopedAuditions();

    if (ui.view === "all") {
      for (const audition of scoped) {
        for (const singer of audition.singers) {
          rows.push({ singer, audition });
        }
      }
    } else {
      const audition = ensureActiveAudition();
      if (audition) {
        rows = audition.singers.map((singer) => ({ singer, audition }));
      }
    }

    rows = rows.filter(({ singer, audition }) => {
      if (ui.voiceFilter && singer.voiceType !== ui.voiceFilter) return false;
      return matchesSearch(singer, audition, query);
    });

    rows.sort((a, b) => compareValues(a.singer, b.singer, ui.sortBy));
    return rows;
  }

  function fillVoiceSelects() {
    const options = VOICE_TYPES.map((v) => `<option value="${v}">${v}</option>`).join("");
    el.singerVoice.innerHTML = options;
    el.voiceFilter.innerHTML = `<option value="">All voices</option>${options}`;
  }

  function fillRoleSelect(audition, selectedRole) {
    const roles = audition?.roles || [];
    const options = [`<option value="">—</option>`];
    for (const role of roles) {
      options.push(`<option value="${escapeHtml(role)}">${escapeHtml(role)}</option>`);
    }
    if (selectedRole && !roles.includes(selectedRole)) {
      options.push(
        `<option value="${escapeHtml(selectedRole)}">${escapeHtml(selectedRole)} (not in list)</option>`
      );
    }
    el.singerRole.innerHTML = options.join("");
    el.singerRole.value = selectedRole || "";
  }

  function renderRolesEditor() {
    if (!draftRoles.length) {
      el.rolesList.innerHTML = `<div class="roles-empty">No roles yet. Add the cast list for this audition.</div>`;
      return;
    }
    el.rolesList.innerHTML = draftRoles
      .map(
        (role, index) => `
      <div class="role-row" data-index="${index}">
        <span class="role-name">${escapeHtml(role)}</span>
        <div class="role-actions">
          <button type="button" class="btn btn-ghost btn-icon" data-role-action="up" aria-label="Move up" ${index === 0 ? "disabled" : ""}>↑</button>
          <button type="button" class="btn btn-ghost btn-icon" data-role-action="down" aria-label="Move down" ${index === draftRoles.length - 1 ? "disabled" : ""}>↓</button>
          <button type="button" class="btn btn-ghost btn-icon" data-role-action="remove" aria-label="Remove">×</button>
        </div>
      </div>`
      )
      .join("");
  }

  function addDraftRole() {
    const text = el.roleAddInput.value.trim();
    if (!text) return;
    if (draftRoles.some((r) => r.toLowerCase() === text.toLowerCase())) {
      showToast("That role is already on the list.", true);
      return;
    }
    draftRoles.push(text);
    el.roleAddInput.value = "";
    renderRolesEditor();
    el.roleAddInput.focus();
  }

  function fillAuditionGroupSelect(selectedGroupId) {
    const options = [`<option value="">Ungrouped</option>`];
    for (const group of sortedGroups()) {
      options.push(`<option value="${escapeHtml(group.id)}">${escapeHtml(group.name)}</option>`);
    }
    el.auditionGroup.innerHTML = options.join("");
    el.auditionGroup.value = selectedGroupId || "";
  }

  function renderGroupFilter() {
    const groups = sortedGroups();
    el.groupFilter.innerHTML =
      `<option value="">All groups</option>` +
      groups.map((g) => `<option value="${escapeHtml(g.id)}">${escapeHtml(g.name)}</option>`).join("");
    el.groupFilter.value = state.activeGroupId || "";
    el.groupFilter.disabled = false;

    const scoped = getScopedAuditions();
    const activeGroup = getActiveGroup();
    if (activeGroup) {
      el.groupMeta.innerHTML = `
        <span><strong>${escapeHtml(activeGroup.name)}</strong></span>
        <span>${scoped.length} audition${scoped.length === 1 ? "" : "s"} in this group</span>
        <span>Search and lists are limited to this group</span>`;
    } else {
      el.groupMeta.innerHTML = `
        <span><strong>All groups</strong></span>
        <span>${state.auditions.length} audition${state.auditions.length === 1 ? "" : "s"} total</span>
        <span>${groups.length} group${groups.length === 1 ? "" : "s"}</span>`;
    }
  }

  function renderGroupsManager() {
    const groups = sortedGroups();
    if (!groups.length) {
      el.groupsList.innerHTML = `<div class="roles-empty">No groups yet. Add one for a casting cycle (e.g. Fall 2026 — Spring Operas).</div>`;
      return;
    }
    el.groupsList.innerHTML = groups
      .map((group) => {
        const count = state.auditions.filter((a) => a.groupId === group.id).length;
        return `
        <div class="role-row" data-group-id="${escapeHtml(group.id)}">
          <span class="role-name">${escapeHtml(group.name)} <span class="group-count">(${count})</span></span>
          <div class="role-actions">
            <button type="button" class="btn btn-ghost" data-group-action="rename">Rename</button>
            <button type="button" class="btn btn-ghost btn-icon" data-group-action="remove" aria-label="Delete">×</button>
          </div>
        </div>`;
      })
      .join("");
  }

  function openGroupsDialog() {
    el.groupAddInput.value = "";
    renderGroupsManager();
    openDialog(el.groupsDialog);
  }

  function addGroup() {
    const name = el.groupAddInput.value.trim();
    if (!name) return;
    if (state.auditionGroups.some((g) => g.name.toLowerCase() === name.toLowerCase())) {
      showToast("That group name already exists.", true);
      return;
    }
    state.auditionGroups.push({
      id: uid(),
      name,
      createdAt: new Date().toISOString(),
    });
    el.groupAddInput.value = "";
    persist();
    renderGroupsManager();
    render();
    showToast("Group added.");
    el.groupAddInput.focus();
  }

  async function renameGroup(groupId) {
    const group = state.auditionGroups.find((g) => g.id === groupId);
    if (!group) return;
    const next = window.prompt("Rename audition group:", group.name);
    if (next == null) return;
    const name = next.trim();
    if (!name) {
      showToast("Group name cannot be empty.", true);
      return;
    }
    if (
      state.auditionGroups.some(
        (g) => g.id !== groupId && g.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      showToast("That group name already exists.", true);
      return;
    }
    group.name = name;
    persist();
    renderGroupsManager();
    render();
    showToast("Group renamed.");
  }

  async function deleteGroup(groupId) {
    const group = state.auditionGroups.find((g) => g.id === groupId);
    if (!group) return;
    const count = state.auditions.filter((a) => a.groupId === groupId).length;
    const ok = await confirmDialog(
      "Delete group?",
      count
        ? `Delete “${group.name}”? ${count} audition${count === 1 ? "" : "s"} will become Ungrouped.`
        : `Delete “${group.name}”?`,
      "Delete"
    );
    if (!ok) return;
    state.auditionGroups = state.auditionGroups.filter((g) => g.id !== groupId);
    for (const audition of state.auditions) {
      if (audition.groupId === groupId) audition.groupId = null;
    }
    if (state.activeGroupId === groupId) state.activeGroupId = null;
    persist();
    renderGroupsManager();
    render();
    showToast("Group deleted.");
  }

  function renderSessionSelect() {
    const auditions = [...getScopedAuditions()].sort(
      (a, b) => String(b.date).localeCompare(String(a.date)) || String(a.name).localeCompare(String(b.name))
    );
    if (!auditions.length) {
      el.auditionSelect.innerHTML = `<option value="">${state.activeGroupId ? "No auditions in this group" : "No auditions yet"}</option>`;
      el.auditionSelect.disabled = true;
      el.editAuditionBtn.disabled = true;
      el.sessionMeta.innerHTML = state.activeGroupId
        ? `<span>No auditions in this group yet. Create one or switch groups.</span>`
        : `<span>Create an audition to start logging singers.</span>`;
      return;
    }

    el.auditionSelect.disabled = false;
    el.editAuditionBtn.disabled = ui.view === "all";
    el.auditionSelect.innerHTML = auditions
      .map((a) => {
        const label = `${a.name} — ${formatDate(a.date)}${a.location ? ` · ${a.location}` : ""}`;
        return `<option value="${a.id}" ${a.id === state.activeAuditionId ? "selected" : ""}>${escapeHtml(label)}</option>`;
      })
      .join("");

    const active = getActiveAudition();
    if (active) {
      const roleCount = (active.roles || []).length;
      el.sessionMeta.innerHTML = `
        <span><strong>${escapeHtml(active.name)}</strong></span>
        <span>${escapeHtml(formatDate(active.date))}</span>
        <span>${escapeHtml(active.location || "No location")}</span>
        <span>${escapeHtml(groupName(active.groupId))}</span>
        <span>${active.singers.length} singer${active.singers.length === 1 ? "" : "s"}</span>
        <span>${roleCount} role${roleCount === 1 ? "" : "s"}</span>
      `;
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function singerCardHtml(singer, audition, { showAudition = false } = {}) {
    const open = ui.openSingerId === singer.id;
    const name = singer.name?.trim() || "Unnamed";
    const metaBits = [];
    if (showAudition) metaBits.push(audition.name);
    if (singer.roleConsidered) metaBits.push(singer.roleConsidered);
    else if (singer.repertoire) metaBits.push(singer.repertoire);
    const meta = metaBits.join(" · ");
    const scoreLabel = singer.score == null ? "" : `Score ${singer.score}`;
    return `
      <article class="singer-row ${open ? "open" : ""}" data-singer-id="${singer.id}" data-audition-id="${audition.id}">
        <button type="button" class="singer-summary" data-action="toggle">
          <div class="singer-num">${escapeHtml(singer.number || "—")}</div>
          <div class="singer-main">
            <div class="singer-name">${escapeHtml(name)}</div>
            <div class="singer-meta">${escapeHtml(meta)}</div>
          </div>
          <div class="singer-aside">
            <div class="singer-voice">${escapeHtml(singer.voiceType || "")}</div>
            ${scoreLabel ? `<div class="singer-score">${escapeHtml(scoreLabel)}</div>` : ""}
          </div>
        </button>
        <div class="singer-detail">
          <div class="form-grid">
            <div class="field"><label>Number</label><div>${escapeHtml(singer.number || "—")}</div></div>
            <div class="field"><label>Voice type</label><div>${escapeHtml(singer.voiceType || "—")}</div></div>
            <div class="field"><label>Score</label><div>${escapeHtml(formatScore(singer.score))}</div></div>
            <div class="field"><label>Role considered</label><div>${escapeHtml(singer.roleConsidered || "—")}</div></div>
            <div class="field span-2"><label>Name</label><div>${escapeHtml(singer.name || "—")}</div></div>
            <div class="field span-2"><label>Repertoire</label><div>${escapeHtml(singer.repertoire || "—")}</div></div>
            <div class="field span-2"><label>Notes</label><div>${escapeHtml(singer.notes || "—")}</div></div>
            ${showAudition ? `<div class="field span-2"><label>Audition</label><div>${escapeHtml(window.AuditionExport.auditionLabel(audition))}</div></div>` : ""}
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" data-action="edit">Edit</button>
            <button type="button" class="btn btn-danger" data-action="delete">Delete</button>
          </div>
        </div>
      </article>`;
  }

  function renderList() {
    if (ui.view === "byRole") {
      renderByRole();
      return;
    }

    const rows = getVisibleRows();
    const scoped = getScopedAuditions();
    const totalInView =
      ui.view === "all"
        ? scoped.reduce((n, a) => n + a.singers.length, 0)
        : getActiveAudition()?.singers.length || 0;

    const groupLabel = getActiveGroup()?.name;
    el.listTitle.textContent =
      ui.view === "all"
        ? groupLabel
          ? `All singers · ${groupLabel}`
          : "All singers"
        : "Singers";
    el.listCount.textContent =
      rows.length === totalInView
        ? `${rows.length} shown`
        : `${rows.length} of ${totalInView} shown`;

    if (!state.auditions.length) {
      el.singerList.innerHTML = `
        <div class="empty">
          <strong>No auditions yet</strong>
          Create your first audition session to begin tracking singers.
        </div>`;
      return;
    }

    if (!scoped.length && state.activeGroupId) {
      el.singerList.innerHTML = `
        <div class="empty">
          <strong>No auditions in this group</strong>
          Create an audition in this group, or choose All groups.
        </div>`;
      return;
    }

    if (!rows.length) {
      el.singerList.innerHTML = `
        <div class="empty">
          <strong>No singers match</strong>
          ${totalInView ? "Try clearing search or filters." : "Tap Add Singer or Import Excel to log entries."}
        </div>`;
      return;
    }

    el.singerList.innerHTML = rows
      .map(({ singer, audition }) => singerCardHtml(singer, audition, { showAudition: ui.view === "all" }))
      .join("");
  }

  function renderByRole() {
    const audition = ensureActiveAudition();
    el.listTitle.textContent = "By role";

    if (!audition) {
      el.listCount.textContent = "";
      el.singerList.innerHTML = `
        <div class="empty">
          <strong>No auditions yet</strong>
          Create an audition and add roles to tabulate scores.
        </div>`;
      return;
    }

    const query = ui.search.trim().toLowerCase();
    let singers = audition.singers.filter((singer) => {
      if (ui.voiceFilter && singer.voiceType !== ui.voiceFilter) return false;
      return matchesSearch(singer, audition, query);
    });

    const roleOrder = [...(audition.roles || [])];
    const groups = new Map();
    for (const role of roleOrder) groups.set(role, []);
    groups.set("", []);

    for (const singer of singers) {
      const role = singer.roleConsidered || "";
      if (!groups.has(role)) groups.set(role, []);
      groups.get(role).push(singer);
    }

    for (const list of groups.values()) {
      list.sort(compareByScoreDesc);
    }

    const sections = [];
    const orderedKeys = [
      ...roleOrder,
      ...[...groups.keys()].filter((k) => k && !roleOrder.includes(k)),
      "",
    ];

    let shown = 0;
    for (const role of orderedKeys) {
      const list = groups.get(role) || [];
      if (!list.length && role === "" && roleOrder.length) continue;
      if (!list.length && role !== "" && !roleOrder.includes(role)) continue;
      shown += list.length;
      const title = role || "Unassigned";
      sections.push(`
        <section class="role-group">
          <div class="role-group-header">
            <h3>${escapeHtml(title)}</h3>
            <span>${list.length} singer${list.length === 1 ? "" : "s"}</span>
          </div>
          ${
            list.length
              ? list.map((singer) => singerCardHtml(singer, audition)).join("")
              : `<div class="role-group-empty">No singers assigned yet.</div>`
          }
        </section>`);
    }

    el.listCount.textContent = `${shown} shown`;

    if (!roleOrder.length && !audition.singers.length) {
      el.singerList.innerHTML = `
        <div class="empty">
          <strong>No roles or singers yet</strong>
          Edit audition details to add roles, then score singers for each role.
        </div>`;
      return;
    }

    if (!sections.length || (shown === 0 && query)) {
      el.singerList.innerHTML = `
        <div class="empty">
          <strong>No singers match</strong>
          Try clearing search or filters.
        </div>`;
      return;
    }

    el.singerList.innerHTML = sections.join("");
  }

  function render() {
    el.viewSession.setAttribute("aria-pressed", ui.view === "session" ? "true" : "false");
    el.viewAll.setAttribute("aria-pressed", ui.view === "all" ? "true" : "false");
    el.viewByRole.setAttribute("aria-pressed", ui.view === "byRole" ? "true" : "false");

    el.sessionPanel.classList.toggle("hidden", ui.view === "all");
    el.sortField.classList.toggle("hidden", ui.view === "byRole");
    el.importExcelBtn.classList.toggle("hidden", ui.view !== "session");
    el.addSingerBtn.classList.toggle("hidden", ui.view === "byRole");
    el.actionDeleteSession.classList.toggle("hidden", ui.view === "all" || !getActiveAudition());

    renderGroupFilter();
    renderSessionSelect();
    renderList();
  }

  function openAuditionDialog(audition = null) {
    ui.editingAuditionId = audition?.id || null;
    el.auditionDialogTitle.textContent = audition ? "Edit Audition" : "New Audition";
    el.auditionName.value = audition?.name || "";
    el.auditionDate.value = audition?.date || todayISO();
    el.auditionLocation.value = audition?.location || "";
    fillAuditionGroupSelect(audition?.groupId || state.activeGroupId || "");
    draftRoles = audition ? [...(audition.roles || [])] : [];
    el.roleAddInput.value = "";
    renderRolesEditor();
    openDialog(el.auditionDialog);
  }

  function openSingerDialog(auditionId, singer = null) {
    const audition = state.auditions.find((a) => a.id === auditionId);
    el.singerDialogTitle.textContent = singer ? "Edit Singer" : "Add Singer";
    el.singerId.value = singer?.id || "";
    el.singerAuditionId.value = auditionId;
    el.singerNumber.value = singer?.number || (audition ? nextAuditionNumber(audition) : "");
    el.singerVoice.value = singer?.voiceType || VOICE_TYPES[0];
    el.singerName.value = singer?.name || "";
    el.singerRepertoire.value = singer?.repertoire || "";
    el.singerNotes.value = singer?.notes || "";
    fillRoleSelect(audition, singer?.roleConsidered || "");
    el.singerScore.value = singer?.score == null ? "" : String(singer.score);
    el.deleteSingerBtn.classList.toggle("hidden", !singer);
    openDialog(el.singerDialog);
  }

  function findSinger(auditionId, singerId) {
    const audition = state.auditions.find((a) => a.id === auditionId);
    if (!audition) return { audition: null, singer: null, index: -1 };
    const index = audition.singers.findIndex((s) => s.id === singerId);
    return { audition, singer: index >= 0 ? audition.singers[index] : null, index };
  }

  function applyRolesToAudition(audition, roles) {
    const previous = new Set(audition.roles || []);
    audition.roles = normalizeRoles(roles);
    const next = new Set(audition.roles);
    for (const singer of audition.singers) {
      if (singer.roleConsidered && previous.has(singer.roleConsidered) && !next.has(singer.roleConsidered)) {
        singer.roleConsidered = "";
      }
    }
  }

  async function deleteSinger(auditionId, singerId) {
    const ok = await confirmDialog(
      "Delete singer?",
      "This removes the singer from this audition. This cannot be undone.",
      "Delete"
    );
    if (!ok) return;
    const { audition, index } = findSinger(auditionId, singerId);
    if (!audition || index < 0) return;
    audition.singers.splice(index, 1);
    if (ui.openSingerId === singerId) ui.openSingerId = null;
    persist();
    render();
    showToast("Singer deleted.");
  }

  async function deleteActiveAudition() {
    const active = getActiveAudition();
    if (!active) return;
    const ok = await confirmDialog(
      "Delete audition?",
      `Delete “${active.name}” and all ${active.singers.length} singer${active.singers.length === 1 ? "" : "s"}? This cannot be undone.`,
      "Delete"
    );
    if (!ok) return;
    state.auditions = state.auditions.filter((a) => a.id !== active.id);
    state.activeAuditionId = state.auditions[0]?.id || null;
    persist();
    render();
    showToast("Audition deleted.");
  }

  function backupToFile() {
    const payload = {
      version: STORE_VERSION,
      auditionGroups: state.auditionGroups,
      auditions: state.auditions,
      activeAuditionId: state.activeAuditionId,
      activeGroupId: state.activeGroupId,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `audition-ledger-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Backup saved — choose Files / iCloud Drive if prompted.");
  }

  async function restoreFromFile(file) {
    let parsed;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      showToast("Could not read that file as JSON.", true);
      return;
    }

    let next;
    try {
      next = normalizeStore(parsed);
    } catch (err) {
      showToast(err.message || "Invalid backup file.", true);
      return;
    }

    const ok = await confirmDialog(
      "Replace all data?",
      "Loading this backup will overwrite every audition and singer currently on this device.",
      "Replace data"
    );
    if (!ok) return;

    state = next;
    if (!state.activeAuditionId && state.auditions.length) {
      state.activeAuditionId = state.auditions[0].id;
    }
    ensureActiveAudition();
    persist();
    render();
    showToast("Backup restored.");
  }

  function exportExcel() {
    try {
      if (ui.view === "all") {
        const scoped = getScopedAuditions();
        if (!scoped.length) {
          showToast("Nothing to export yet.", true);
          return;
        }
        window.AuditionExport.exportAllAuditionsToExcel(scoped);
        showToast(
          state.activeGroupId
            ? "Excel workbook downloaded for this group."
            : "Excel workbook downloaded."
        );
        return;
      }
      const active = getActiveAudition();
      if (!active) {
        showToast("Create an audition first.", true);
        return;
      }
      window.AuditionExport.exportAuditionToExcel(active);
      showToast("Excel file downloaded.");
    } catch (err) {
      console.error(err);
      showToast(err.message || "Export failed.", true);
    }
  }

  async function importExcelFile(file) {
    const active = ensureActiveAudition();
    if (!active) {
      openAuditionDialog(null);
      showToast("Create an audition first, then import.", true);
      return;
    }

    let parsed;
    try {
      const buffer = await file.arrayBuffer();
      parsed = window.AuditionExport.parseExcelRoster(buffer);
    } catch (err) {
      console.error(err);
      showToast(err.message || "Could not read that Excel file.", true);
      return;
    }

    if (!parsed.rows.length) {
      showToast(
        parsed.skipped
          ? `No singers imported (${parsed.skipped} skipped — check Voice Type).`
          : "No singer rows found in that file.",
        true
      );
      return;
    }

    let nextNum = parseInt(nextAuditionNumber(active), 10) || 1;
    for (const row of parsed.rows) {
      let number = row.number;
      if (!number) {
        number = String(nextNum);
        nextNum += 1;
      } else {
        const n = parseInt(String(number).replace(/[^\d]/g, ""), 10);
        if (Number.isFinite(n) && n >= nextNum) nextNum = n + 1;
      }
      active.singers.push({
        id: uid(),
        number: String(number),
        name: row.name,
        voiceType: row.voiceType,
        repertoire: row.repertoire,
        notes: "",
        roleConsidered: "",
        score: null,
      });
    }

    persist();
    render();
    const skipNote = parsed.skipped ? ` (${parsed.skipped} skipped)` : "";
    showToast(`Imported ${parsed.rows.length} singer${parsed.rows.length === 1 ? "" : "s"}${skipNote}.`);
  }

  function bindEvents() {
    el.viewSession.addEventListener("click", () => {
      ui.view = "session";
      render();
    });
    el.viewAll.addEventListener("click", () => {
      ui.view = "all";
      closeMenu();
      render();
    });
    el.viewByRole.addEventListener("click", () => {
      ui.view = "byRole";
      closeMenu();
      render();
    });

    el.menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = !el.menuPanel.classList.contains("open");
      el.menuPanel.classList.toggle("open", open);
      el.menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", (e) => {
      if (!el.menuPanel.contains(e.target) && e.target !== el.menuBtn) closeMenu();
    });

    el.actionExport.addEventListener("click", () => {
      closeMenu();
      exportExcel();
    });
    el.actionBackup.addEventListener("click", () => {
      closeMenu();
      backupToFile();
    });
    el.actionRestore.addEventListener("click", () => {
      closeMenu();
      el.restoreInput.click();
    });
    el.actionDeleteSession.addEventListener("click", () => {
      closeMenu();
      deleteActiveAudition();
    });
    el.actionManageGroups.addEventListener("click", () => {
      closeMenu();
      openGroupsDialog();
    });
    el.manageGroupsBtn.addEventListener("click", () => openGroupsDialog());

    el.groupFilter.addEventListener("change", () => {
      state.activeGroupId = el.groupFilter.value || null;
      ensureActiveAudition();
      persist();
      render();
    });

    el.groupAddBtn.addEventListener("click", () => addGroup());
    el.groupAddInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addGroup();
      }
    });
    el.groupsList.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-group-action]");
      if (!btn) return;
      const row = btn.closest("[data-group-id]");
      if (!row) return;
      const groupId = row.dataset.groupId;
      if (btn.dataset.groupAction === "rename") await renameGroup(groupId);
      if (btn.dataset.groupAction === "remove") await deleteGroup(groupId);
    });

    el.restoreInput.addEventListener("change", async () => {
      const file = el.restoreInput.files?.[0];
      el.restoreInput.value = "";
      if (file) await restoreFromFile(file);
    });

    el.importExcelBtn.addEventListener("click", () => {
      const active = ensureActiveAudition();
      if (!active) {
        openAuditionDialog(null);
        showToast("Create an audition first, then import.", true);
        return;
      }
      el.importExcelInput.click();
    });
    el.importExcelInput.addEventListener("change", async () => {
      const file = el.importExcelInput.files?.[0];
      el.importExcelInput.value = "";
      if (file) await importExcelFile(file);
    });

    el.auditionSelect.addEventListener("change", () => {
      state.activeAuditionId = el.auditionSelect.value || null;
      persist();
      render();
    });
    el.newAuditionBtn.addEventListener("click", () => openAuditionDialog(null));
    el.editAuditionBtn.addEventListener("click", () => {
      const active = getActiveAudition();
      if (active) openAuditionDialog(active);
    });

    el.roleAddBtn.addEventListener("click", () => addDraftRole());
    el.roleAddInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addDraftRole();
      }
    });
    el.rolesList.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-role-action]");
      if (!btn) return;
      const row = btn.closest(".role-row");
      if (!row) return;
      const index = Number(row.dataset.index);
      const action = btn.dataset.roleAction;
      if (action === "remove") {
        draftRoles.splice(index, 1);
      } else if (action === "up" && index > 0) {
        [draftRoles[index - 1], draftRoles[index]] = [draftRoles[index], draftRoles[index - 1]];
      } else if (action === "down" && index < draftRoles.length - 1) {
        [draftRoles[index + 1], draftRoles[index]] = [draftRoles[index], draftRoles[index + 1]];
      }
      renderRolesEditor();
    });

    el.searchInput.addEventListener("input", () => {
      ui.search = el.searchInput.value;
      renderList();
    });
    el.voiceFilter.addEventListener("change", () => {
      ui.voiceFilter = el.voiceFilter.value;
      renderList();
    });
    el.sortBy.addEventListener("change", () => {
      ui.sortBy = el.sortBy.value;
      renderList();
    });

    el.addSingerBtn.addEventListener("click", () => {
      const active = ensureActiveAudition();
      if (!active) {
        openAuditionDialog(null);
        showToast("Create an audition first, then add singers.", true);
        return;
      }
      openSingerDialog(active.id, null);
    });

    el.auditionForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = el.auditionName.value.trim();
      const date = el.auditionDate.value;
      const location = el.auditionLocation.value.trim();
      const groupId = el.auditionGroup.value || null;
      if (!name || !date) return;

      if (ui.editingAuditionId) {
        const audition = state.auditions.find((a) => a.id === ui.editingAuditionId);
        if (audition) {
          audition.name = name;
          audition.date = date;
          audition.location = location;
          audition.groupId = groupId;
          applyRolesToAudition(audition, draftRoles);
        }
      } else {
        const audition = {
          id: uid(),
          name,
          date,
          location,
          createdAt: new Date().toISOString(),
          groupId,
          roles: normalizeRoles(draftRoles),
          singers: [],
        };
        state.auditions.push(audition);
        state.activeAuditionId = audition.id;
        if (groupId) state.activeGroupId = groupId;
        ui.view = "session";
      }
      persist();
      closeDialog(el.auditionDialog);
      render();
      showToast(ui.editingAuditionId ? "Audition updated." : "Audition created.");
    });

    el.singerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const auditionId = el.singerAuditionId.value;
      const audition = state.auditions.find((a) => a.id === auditionId);
      if (!audition) return;

      const payload = {
        number: el.singerNumber.value.trim(),
        name: el.singerName.value.trim(),
        voiceType: el.singerVoice.value,
        repertoire: el.singerRepertoire.value.trim(),
        notes: el.singerNotes.value.trim(),
        roleConsidered: el.singerRole.value,
        score: normalizeScore(el.singerScore.value),
      };
      if (!payload.number) {
        showToast("Number is required.", true);
        return;
      }

      const existingId = el.singerId.value;
      if (existingId) {
        const { singer } = findSinger(auditionId, existingId);
        if (singer) Object.assign(singer, payload);
      } else {
        audition.singers.push({ id: uid(), ...payload });
      }
      persist();
      closeDialog(el.singerDialog);
      render();
      showToast(existingId ? "Singer updated." : "Singer added.");
    });

    el.deleteSingerBtn.addEventListener("click", async () => {
      const auditionId = el.singerAuditionId.value;
      const singerId = el.singerId.value;
      closeDialog(el.singerDialog);
      await deleteSinger(auditionId, singerId);
    });

    el.singerList.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const row = btn.closest(".singer-row");
      if (!row) return;
      const singerId = row.dataset.singerId;
      const auditionId = row.dataset.auditionId;
      const action = btn.dataset.action;

      if (action === "toggle") {
        ui.openSingerId = ui.openSingerId === singerId ? null : singerId;
        renderList();
        return;
      }
      if (action === "edit") {
        const { singer } = findSinger(auditionId, singerId);
        if (singer) openSingerDialog(auditionId, singer);
        return;
      }
      if (action === "delete") {
        await deleteSinger(auditionId, singerId);
      }
    });

    document.querySelectorAll("[data-close]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-close");
        closeDialog(document.getElementById(id));
      });
    });

    el.confirmCancel.addEventListener("click", () => {
      closeDialog(el.confirmDialog);
      if (ui.confirmResolver) {
        ui.confirmResolver(false);
        ui.confirmResolver = null;
      }
    });
    el.confirmOk.addEventListener("click", () => {
      closeDialog(el.confirmDialog);
      if (ui.confirmResolver) {
        ui.confirmResolver(true);
        ui.confirmResolver = null;
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      closeMenu();
      [el.auditionDialog, el.singerDialog, el.groupsDialog, el.confirmDialog].forEach((d) => {
        if (d.classList.contains("open")) {
          if (d === el.confirmDialog && ui.confirmResolver) {
            ui.confirmResolver(false);
            ui.confirmResolver = null;
          }
          closeDialog(d);
        }
      });
    });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./sw.js", { updateViaCache: "none" })
        .then((reg) => reg.update())
        .catch((err) => {
          console.warn("Service worker registration failed:", err);
        });
    });
  }

  function init() {
    fillVoiceSelects();
    load();
    ensureActiveAudition();
    bindEvents();
    render();
    registerServiceWorker();
  }

  init();
})();
