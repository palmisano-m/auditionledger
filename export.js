/* global XLSX */

const VOICE_TYPES = [
  "Soprano",
  "Mezzo-Soprano",
  "Countertenor",
  "Tenor",
  "Baritone",
  "Bass",
];

const VOICE_ALIASES = {
  soprano: "Soprano",
  sop: "Soprano",
  "mezzo-soprano": "Mezzo-Soprano",
  mezzo: "Mezzo-Soprano",
  "mezzo soprano": "Mezzo-Soprano",
  mezzosoprano: "Mezzo-Soprano",
  countertenor: "Countertenor",
  "counter tenor": "Countertenor",
  ct: "Countertenor",
  tenor: "Tenor",
  t: "Tenor",
  baritone: "Baritone",
  bari: "Baritone",
  bar: "Baritone",
  bass: "Bass",
  b: "Bass",
};

function sanitizeSheetName(name) {
  const cleaned = String(name || "Audition")
    .replace(/[\\:.*?\/\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (cleaned || "Audition").slice(0, 31);
}

function uniqueSheetName(base, used) {
  let name = sanitizeSheetName(base);
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  let n = 2;
  while (n < 1000) {
    const suffix = ` (${n})`;
    const truncated = sanitizeSheetName(base).slice(0, 31 - suffix.length) + suffix;
    if (!used.has(truncated)) {
      used.add(truncated);
      return truncated;
    }
    n += 1;
  }
  const fallback = `Sheet ${used.size + 1}`;
  used.add(fallback);
  return fallback;
}

function singerToRow(singer, auditionLabel) {
  const row = {
    Number: singer.number ?? "",
    Name: singer.name ?? "",
    "Voice Type": singer.voiceType ?? "",
    Repertoire: singer.repertoire ?? "",
    Notes: singer.notes ?? "",
    "Role Considered": singer.roleConsidered ?? "",
    Score: singer.score == null ? "" : singer.score,
  };
  if (auditionLabel != null) {
    return { Audition: auditionLabel, ...row };
  }
  return row;
}

function auditionLabel(audition) {
  const parts = [audition.name, audition.date, audition.location].filter(Boolean);
  return parts.join(" · ") || "Audition";
}

function downloadWorkbook(workbook, filename) {
  XLSX.writeFile(workbook, filename);
}

function exportAuditionToExcel(audition) {
  if (typeof XLSX === "undefined") {
    throw new Error("Excel library failed to load.");
  }
  const rows = (audition.singers || []).map((s) => singerToRow(s));
  const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [singerToRow({})]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, uniqueSheetName(audition.name || "Audition", new Set()));
  const safeName = (audition.name || "Audition").replace(/[\\/:*?"<>|]/g, "-").trim() || "Audition";
  const datePart = audition.date || new Date().toISOString().slice(0, 10);
  downloadWorkbook(workbook, `Audition_${safeName}_${datePart}.xlsx`);
}

function exportAllAuditionsToExcel(auditions) {
  if (typeof XLSX === "undefined") {
    throw new Error("Excel library failed to load.");
  }
  const workbook = XLSX.utils.book_new();
  const used = new Set();

  const combined = [];
  for (const audition of auditions) {
    const label = auditionLabel(audition);
    for (const singer of audition.singers || []) {
      combined.push(singerToRow(singer, label));
    }
  }
  const allSheet = XLSX.utils.json_to_sheet(
    combined.length ? combined : [singerToRow({}, "")]
  );
  XLSX.utils.book_append_sheet(workbook, allSheet, uniqueSheetName("All Singers", used));

  for (const audition of auditions) {
    const rows = (audition.singers || []).map((s) => singerToRow(s));
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [singerToRow({})]);
    const sheetName = uniqueSheetName(audition.name || "Audition", used);
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  }

  const datePart = new Date().toISOString().slice(0, 10);
  downloadWorkbook(workbook, `AuditionLedger_All_${datePart}.xlsx`);
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function mapImportHeader(header) {
  const h = normalizeHeader(header);
  if (!h) return null;
  if (["name", "singer", "singer name", "artist"].includes(h)) return "name";
  if (["voice type", "voice", "fach", "voice fach"].includes(h)) return "voiceType";
  if (["repertoire", "rep", "aria", "arias", "song", "songs"].includes(h)) return "repertoire";
  if (["number", "no", "num", "#", "audition number"].includes(h)) return "number";
  return null;
}

function normalizeVoiceType(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  if (VOICE_TYPES.includes(text)) return text;
  const key = text.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (VOICE_ALIASES[key]) return VOICE_ALIASES[key];
  const matched = VOICE_TYPES.find((v) => v.toLowerCase() === key);
  return matched || null;
}

/**
 * Parse first sheet of an Excel file into singer field objects.
 * @returns {{ rows: Array<{name:string, voiceType:string, repertoire:string, number:string}>, skipped: number }}
 */
function parseExcelRoster(arrayBuffer) {
  if (typeof XLSX === "undefined") {
    throw new Error("Excel library failed to load.");
  }
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Workbook has no sheets.");
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
  if (!rawRows.length) return { rows: [], skipped: 0 };

  const headerMap = {};
  for (const key of Object.keys(rawRows[0])) {
    const mapped = mapImportHeader(key);
    if (mapped) headerMap[key] = mapped;
  }
  if (!Object.values(headerMap).includes("name") && !Object.values(headerMap).includes("voiceType")) {
    throw new Error("Could not find Name or Voice Type columns.");
  }

  const rows = [];
  let skipped = 0;
  for (const raw of rawRows) {
    const mapped = { name: "", voiceType: "", repertoire: "", number: "" };
    for (const [key, field] of Object.entries(headerMap)) {
      mapped[field] = String(raw[key] ?? "").trim();
    }
    if (!mapped.name && !mapped.voiceType && !mapped.repertoire && !mapped.number) {
      continue;
    }
    const voiceType = normalizeVoiceType(mapped.voiceType);
    if (!voiceType) {
      skipped += 1;
      continue;
    }
    rows.push({
      name: mapped.name,
      voiceType,
      repertoire: mapped.repertoire,
      number: mapped.number,
    });
  }
  return { rows, skipped };
}

window.AuditionExport = {
  VOICE_TYPES,
  exportAuditionToExcel,
  exportAllAuditionsToExcel,
  auditionLabel,
  parseExcelRoster,
  normalizeVoiceType,
};
