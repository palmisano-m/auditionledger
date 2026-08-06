(() => {
  "use strict";

  const STORAGE_KEY = "audition-ledger-v1";
  const VOICE_TYPES = window.AuditionExport?.VOICE_TYPES || [
    "Soprano",
    "Mezzo-Soprano",
    "Countertenor",
    "Tenor",
    "Baritone",
    "Bass",
  ];

  /** @type {{ version: number, auditions: Array, activeAuditionId: string|null }} */
  let state = {
    version: 1,
    auditions: [],
    activeAuditionId: null,
  };

  let ui = {
    view: "session", // session | all
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
    menuBtn: document.getElementById("menu-btn"),
    menuPanel: document.getElementById("menu-panel"),
    actionExport: document.getElementById("action-export"),
    actionBackup: document.getElementById("action-backup"),
    actionRestore: document.getElementById("action-restore"),
    actionDeleteSession: document.getElementById("action-delete-session"),
    sessionPanel: document.getElementById("session-panel"),
    auditionSelect: document.getElementById("audition-select"),
    newAuditionBtn: document.getElementById("new-audition-btn"),
    editAuditionBtn: document.getElementById("edit-audition-btn"),
    sessionMeta: document.getElementById("session-meta"),
    searchInput: document.getElementById("search-input"),
    voiceFilter: document.getElementById("voice-filter"),
    sortBy: document.getElementById("sort-by"),
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
    deleteSingerBtn: document.getElementById("delete-singer-btn"),
    confirmDialog: document.getElementById("confirm-dialog"),
    confirmTitle: document.getElementById("confirm-title"),
    confirmMessage: document.getElementById("confirm-message"),
    confirmCancel: document.getElementById("confirm-cancel"),
    confirmOk: document.getElementById("confirm-ok"),
    restoreInput: document.getElementById("restore-input"),
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
    showToast._t = setTimeout(() => el.toast.classList.remove("show"), 2600);
  }

  function persist() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: state.version,
          auditions: state.auditions,
          activeAuditionId: state.activeAuditionId,
        })
      );
    } catch (err) {
      console.error(err);
      showToast("Could not save — storage may be full.", true);
    }
  }

  function normalizeStore(raw) {
    if (!raw || typeof raw !== "object") throw new Error("Backup is not a valid object.");
    if (raw.version !== 1) throw new Error("Unsupported backup version.");
    if (!Array.isArray(raw.auditions)) throw new Error("Backup is missing auditions.");

    const auditions = raw.auditions.map((a, i) => {
      if (!a || typeof a !== "object") throw new Error(`Invalid audition at index ${i}.`);
      const singers = Array.isArray(a.singers)
        ? a.singers.map((s, j) => {
            if (!s || typeof s !== "object") throw new Error(`Invalid singer at audition ${i}, index ${j}.`);
            return {
              id: String(s.id || uid()),
              number: s.number != null ? String(s.number) : "",
              name: s.name != null ? String(s.name) : "",
              voiceType: VOICE_TYPES.includes(s.voiceType) ? s.voiceType : "Soprano",
              repertoire: s.repertoire != null ? String(s.repertoire) : "",
              notes: s.notes != null ? String(s.notes) : "",
              roleConsidered: s.roleConsidered != null ? String(s.roleConsidered) : "",
            };
          })
        : [];
      return {
        id: String(a.id || uid()),
        name: String(a.name || "Untitled Audition"),
        date: String(a.date || todayISO()),
        location: a.location != null ? String(a.location) : "",
        createdAt: String(a.createdAt || new Date().toISOString()),
        singers,
      };
    });

    let activeAuditionId = raw.activeAuditionId ? String(raw.activeAuditionId) : null;
    if (activeAuditionId && !auditions.some((a) => a.id === activeAuditionId)) {
      activeAuditionId = auditions[0]?.id || null;
    }

    return { version: 1, auditions, activeAuditionId };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        state = { version: 1, auditions: [], activeAuditionId: null };
        return;
      }
      state = normalizeStore(JSON.parse(raw));
    } catch (err) {
      console.error(err);
      state = { version: 1, auditions: [], activeAuditionId: null };
      showToast("Saved data looked invalid — starting fresh.", true);
    }
  }

  function getActiveAudition() {
    return state.auditions.find((a) => a.id === state.activeAuditionId) || null;
  }

  function ensureActiveAudition() {
    if (!state.auditions.length) {
      state.activeAuditionId = null;
      return null;
    }
    if (!getActiveAudition()) {
      state.activeAuditionId = state.auditions[0].id;
      persist();
    }
    return getActiveAudition();
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
    // name
    const nameCmp = String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
    if (nameCmp !== 0) return nameCmp;
    return compareValues(a, b, "number");
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

    if (ui.view === "all") {
      for (const audition of state.auditions) {
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

  function renderSessionSelect() {
    const auditions = [...state.auditions].sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(a.name).localeCompare(String(b.name)));
    if (!auditions.length) {
      el.auditionSelect.innerHTML = `<option value="">No auditions yet</option>`;
      el.auditionSelect.disabled = true;
      el.editAuditionBtn.disabled = true;
      el.sessionMeta.innerHTML = `<span>Create an audition to start logging singers.</span>`;
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
      el.sessionMeta.innerHTML = `
        <span><strong>${escapeHtml(active.name)}</strong></span>
        <span>${escapeHtml(formatDate(active.date))}</span>
        <span>${escapeHtml(active.location || "No location")}</span>
        <span>${active.singers.length} singer${active.singers.length === 1 ? "" : "s"}</span>
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

  function renderList() {
    const rows = getVisibleRows();
    const totalInView =
      ui.view === "all"
        ? state.auditions.reduce((n, a) => n + a.singers.length, 0)
        : getActiveAudition()?.singers.length || 0;

    el.listTitle.textContent = ui.view === "all" ? "All singers" : "Singers";
    el.listCount.textContent =
      rows.length === totalInView
        ? `${rows.length} shown`
        : `${rows.length} of ${totalInView} shown`;

    el.sessionPanel.classList.toggle("hidden", ui.view === "all");
    el.actionDeleteSession.classList.toggle("hidden", ui.view === "all" || !getActiveAudition());

    if (!state.auditions.length) {
      el.singerList.innerHTML = `
        <div class="empty">
          <strong>No auditions yet</strong>
          Create your first audition session to begin tracking singers.
        </div>`;
      return;
    }

    if (!rows.length) {
      el.singerList.innerHTML = `
        <div class="empty">
          <strong>No singers match</strong>
          ${totalInView ? "Try clearing search or filters." : "Tap Add Singer to log the first entry."}
        </div>`;
      return;
    }

    el.singerList.innerHTML = rows
      .map(({ singer, audition }) => {
        const open = ui.openSingerId === singer.id;
        const name = singer.name?.trim() || "Unnamed";
        const metaBits = [];
        if (ui.view === "all") metaBits.push(audition.name);
        if (singer.repertoire) metaBits.push(singer.repertoire);
        else if (singer.roleConsidered) metaBits.push(singer.roleConsidered);
        const meta = metaBits.join(" · ");
        return `
          <article class="singer-row ${open ? "open" : ""}" data-singer-id="${singer.id}" data-audition-id="${audition.id}">
            <button type="button" class="singer-summary" data-action="toggle">
              <div class="singer-num">${escapeHtml(singer.number || "—")}</div>
              <div class="singer-main">
                <div class="singer-name">${escapeHtml(name)}</div>
                <div class="singer-meta">${escapeHtml(meta)}</div>
              </div>
              <div class="singer-voice">${escapeHtml(singer.voiceType || "")}</div>
            </button>
            <div class="singer-detail">
              <div class="form-grid">
                <div class="field"><label>Number</label><div>${escapeHtml(singer.number || "—")}</div></div>
                <div class="field"><label>Voice type</label><div>${escapeHtml(singer.voiceType || "—")}</div></div>
                <div class="field span-2"><label>Name</label><div>${escapeHtml(singer.name || "—")}</div></div>
                <div class="field span-2"><label>Repertoire</label><div>${escapeHtml(singer.repertoire || "—")}</div></div>
                <div class="field span-2"><label>Notes</label><div>${escapeHtml(singer.notes || "—")}</div></div>
                <div class="field span-2"><label>Role considered</label><div>${escapeHtml(singer.roleConsidered || "—")}</div></div>
                ${ui.view === "all" ? `<div class="field span-2"><label>Audition</label><div>${escapeHtml(window.AuditionExport.auditionLabel(audition))}</div></div>` : ""}
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" data-action="edit">Edit</button>
                <button type="button" class="btn btn-danger" data-action="delete">Delete</button>
              </div>
            </div>
          </article>`;
      })
      .join("");
  }

  function render() {
    el.viewSession.setAttribute("aria-pressed", ui.view === "session" ? "true" : "false");
    el.viewAll.setAttribute("aria-pressed", ui.view === "all" ? "true" : "false");
    renderSessionSelect();
    renderList();
  }

  function openAuditionDialog(audition = null) {
    ui.editingAuditionId = audition?.id || null;
    el.auditionDialogTitle.textContent = audition ? "Edit Audition" : "New Audition";
    el.auditionName.value = audition?.name || "";
    el.auditionDate.value = audition?.date || todayISO();
    el.auditionLocation.value = audition?.location || "";
    openDialog(el.auditionDialog);
  }

  function openSingerDialog(auditionId, singer = null) {
    el.singerDialogTitle.textContent = singer ? "Edit Singer" : "Add Singer";
    el.singerId.value = singer?.id || "";
    el.singerAuditionId.value = auditionId;
    el.singerNumber.value = singer?.number || "";
    el.singerVoice.value = singer?.voiceType || VOICE_TYPES[0];
    el.singerName.value = singer?.name || "";
    el.singerRepertoire.value = singer?.repertoire || "";
    el.singerNotes.value = singer?.notes || "";
    el.singerRole.value = singer?.roleConsidered || "";
    el.deleteSingerBtn.classList.toggle("hidden", !singer);
    openDialog(el.singerDialog);
  }

  function findSinger(auditionId, singerId) {
    const audition = state.auditions.find((a) => a.id === auditionId);
    if (!audition) return { audition: null, singer: null, index: -1 };
    const index = audition.singers.findIndex((s) => s.id === singerId);
    return { audition, singer: index >= 0 ? audition.singers[index] : null, index };
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
      version: 1,
      auditions: state.auditions,
      activeAuditionId: state.activeAuditionId,
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
    persist();
    render();
    showToast("Backup restored.");
  }

  function exportExcel() {
    try {
      if (ui.view === "all") {
        if (!state.auditions.length) {
          showToast("Nothing to export yet.", true);
          return;
        }
        window.AuditionExport.exportAllAuditionsToExcel(state.auditions);
        showToast("Excel workbook downloaded.");
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

    el.restoreInput.addEventListener("change", async () => {
      const file = el.restoreInput.files?.[0];
      el.restoreInput.value = "";
      if (file) await restoreFromFile(file);
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
      if (!name || !date) return;

      if (ui.editingAuditionId) {
        const audition = state.auditions.find((a) => a.id === ui.editingAuditionId);
        if (audition) {
          audition.name = name;
          audition.date = date;
          audition.location = location;
        }
      } else {
        const audition = {
          id: uid(),
          name,
          date,
          location,
          createdAt: new Date().toISOString(),
          singers: [],
        };
        state.auditions.push(audition);
        state.activeAuditionId = audition.id;
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
        roleConsidered: el.singerRole.value.trim(),
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
      [el.auditionDialog, el.singerDialog, el.confirmDialog].forEach((d) => {
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
