/* global XLSX */

const VOICE_TYPES = [
  "Soprano",
  "Mezzo-Soprano",
  "Countertenor",
  "Tenor",
  "Baritone",
  "Bass",
];

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

window.AuditionExport = {
  VOICE_TYPES,
  exportAuditionToExcel,
  exportAllAuditionsToExcel,
  auditionLabel,
};
