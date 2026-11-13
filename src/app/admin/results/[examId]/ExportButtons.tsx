"use client";

import { FileDown, FileSpreadsheet } from "lucide-react";
import { cellSkillLabel, type ResultsData } from "@/lib/supabase/results";

function csvEscape(value: string | number): string {
  const str = String(value);
  // Quote any field containing a comma, quote, or newline — and double up
  // internal quotes — per RFC 4180, so Excel/Sheets parse it correctly
  // regardless of what a student's name or a skill's title happens to contain.
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// One row per student. For each slot the export carries the skill the student
// actually had and its score, so a spreadsheet reader never has to guess.
function buildHeaders(data: ResultsData): string[] {
  const headers = ["Registration Number", "Full Name", "Level"];
  if (data.compulsory) headers.push(`Compulsory: ${data.compulsory.skillName} (/${data.compulsory.assignedMarks})`);
  for (let i = 1; i <= data.drawsPerStudent; i++) {
    headers.push(`Draw ${i} Skill`, `Draw ${i} Score${data.drawnMarks !== null ? ` (/${data.drawnMarks})` : ""}`);
  }
  headers.push(`Practical Total (/${data.practicalTargetTotal})`);
  if (data.hasProject) {
    for (const c of data.components) headers.push(`${c.name} (/${c.maxMarks})`);
    headers.push(`Project Total (/${data.projectMaxTotal})`);
  }
  return headers;
}

function buildRows(data: ResultsData): (string | number)[][] {
  return data.rows.map((row) => {
    const cells: (string | number)[] = [row.registrationNumber, row.fullName, row.level];
    if (data.compulsory) cells.push(row.compulsory?.scaledScore ?? "");
    row.draws.forEach((d) => {
      cells.push(d ? cellSkillLabel(d) : "", d?.scaledScore ?? "");
    });
    cells.push(row.practicalTotal);
    if (data.hasProject) {
      row.componentScores.forEach((v) => cells.push(v ?? ""));
      cells.push(row.projectStatus === "submitted" || row.projectStatus === "amended" ? row.projectTotal : "");
    }
    return cells;
  });
}

function escapeHtml(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function ExportButtons({ data }: { data: ResultsData }) {
  function exportCsv() {
    const headers = buildHeaders(data);
    const rows = buildRows(data);
    const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\r\n");

    // A UTF-8 BOM keeps Excel from mis-reading accented characters in names.
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.examTitle.replace(/[^a-z0-9]+/gi, "_")}_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const win = window.open("", "_blank");
    if (!win) return;

    const headers = buildHeaders(data);
    const rows = buildRows(data);

    const headHtml = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
    const bodyHtml = rows
      .map((r) => `<tr>${r.map((c, i) => `<td${i > 2 && typeof c === "number" ? ' class="num"' : ""}>${escapeHtml(c === "" ? "—" : c)}</td>`).join("")}</tr>`)
      .join("");

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(data.examTitle)} — Results</title>
        <style>
          body { font-family: -apple-system, Segoe UI, Arial, sans-serif; color: #16233D; padding: 24px; }
          h1 { font-size: 16px; margin: 0 0 4px; }
          p.meta { font-size: 11px; color: #5B6472; margin: 0 0 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          @page { size: landscape; margin: 12mm; }
          th, td { border: 1px solid #E6E4DF; padding: 6px 8px; text-align: left; }
          th { background: #F2F2F2; font-weight: 600; }
          td.num { text-align: right; font-variant-numeric: tabular-nums; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div style="margin-bottom:8px"><img src="${window.location.origin}/logo.jpg" alt="" style="height:56px;width:56px;object-fit:contain"></div>
        <h1>${escapeHtml(data.examTitle)}</h1>
        <p class="meta">${escapeHtml(data.courseCode)} · ${escapeHtml(data.academicSession)} · Generated ${new Date().toLocaleDateString()} · Practical /${data.practicalTargetTotal}${data.hasProject ? ` · Project /${data.projectMaxTotal}` : ""} · Only submitted or corrected scores are shown.</p>
        <table>
          <thead><tr>${headHtml}</tr></thead>
          <tbody>${bodyHtml}</tbody>
        </table>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    // Give the new window a tick to finish laying out before print — some
    // browsers print a blank page if called synchronously right after write().
    setTimeout(() => win.print(), 150);
  }

  return (
    <>
      <button onClick={exportPdf} className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-ink-muted hover:bg-bg">
        <FileDown size={14} /> Export PDF
      </button>
      <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-ink-muted hover:bg-bg">
        <FileSpreadsheet size={14} /> Export Excel
      </button>
    </>
  );
}
