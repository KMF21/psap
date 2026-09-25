"use client";

import { FileText } from "lucide-react";
import type { ResultsData, ResultsRow } from "@/lib/supabase/results";

function escapeHtml(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function ResultSheetButton({ data, row }: { data: ResultsData; row: ResultsRow }) {
  function openSheet() {
    const win = window.open("", "_blank");
    if (!win) return;

    const grandMax = data.practicalTargetTotal + data.projectMaxTotal;

    const skillRowsHtml = data.skillColumns
      .map((col, i) => {
        const score = row.skillScores[i];
        return `<tr><td>${escapeHtml(col.skillName)}</td><td class="num">${score === null ? "—" : escapeHtml(score)}</td><td class="num">${col.assignedMarks}</td></tr>`;
      })
      .join("");

    const projectRowsHtml =
      data.projectMaxTotal > 0
        ? row.projectScores
            .map((s, i) => `<tr><td>CSA ${i + 1}</td><td class="num">${escapeHtml(s)}</td></tr>`)
            .join("") || `<tr><td colspan="2" class="muted">Not yet scored</td></tr>`
        : "";

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(row.fullName)} — Result Sheet</title>
        <style>
          body { font-family: -apple-system, Segoe UI, Arial, sans-serif; color: #16233D; padding: 32px; max-width: 640px; margin: 0 auto; }
          h1 { font-size: 18px; margin: 0 0 2px; text-align: center; }
          p.subtitle { font-size: 12px; color: #5B6472; margin: 0 0 24px; text-align: center; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 24px; font-size: 13px; padding: 14px 16px; background: #F2F2F2; border-radius: 6px; }
          .info-grid dt { color: #5B6472; display: inline; }
          .info-grid dd { display: inline; margin: 0 0 0 6px; font-weight: 600; }
          h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.03em; color: #5B6472; margin: 20px 0 8px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 4px; }
          th, td { border: 1px solid #E6E4DF; padding: 7px 10px; text-align: left; }
          th { background: #F2F2F2; font-weight: 600; font-size: 12px; }
          td.num { text-align: right; font-variant-numeric: tabular-nums; }
          td.muted { color: #8B93A1; text-align: center; }
          tr.total td { font-weight: 700; background: #FAFAF8; }
          .grand-total { margin-top: 20px; padding: 14px 16px; background: #E4F2F0; border-radius: 6px; display: flex; justify-content: space-between; align-items: baseline; }
          .grand-total .label { font-size: 13px; font-weight: 600; color: #0B5750; }
          .grand-total .value { font-size: 22px; font-weight: 700; color: #0B5750; font-variant-numeric: tabular-nums; }
          footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #E6E4DF; text-align: center; font-size: 10px; color: #8B93A1; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Practical Skills Assessment — Result Sheet</h1>
        <p class="subtitle">Generated ${new Date().toLocaleDateString()}</p>

        <dl class="info-grid">
          <div><dt>Student:</dt><dd>${escapeHtml(row.fullName)}</dd></div>
          <div><dt>Reg. No.:</dt><dd>${escapeHtml(row.registrationNumber)}</dd></div>
          <div><dt>Level:</dt><dd>${escapeHtml(row.level || "—")}</dd></div>
          <div><dt>Academic Session:</dt><dd>${escapeHtml(data.academicSession)}</dd></div>
          <div style="grid-column: 1 / -1;"><dt>Examination:</dt><dd>${escapeHtml(data.examTitle)}</dd></div>
        </dl>

        <h2>Practical Assessment</h2>
        <table>
          <thead><tr><th>Skill</th><th>Score</th><th>Max</th></tr></thead>
          <tbody>
            ${skillRowsHtml}
            <tr class="total"><td>Total Practical</td><td class="num">${row.practicalTotal}</td><td class="num">${data.practicalTargetTotal}</td></tr>
          </tbody>
        </table>

        ${
          data.projectMaxTotal > 0
            ? `
        <h2>Project Assessment</h2>
        <table>
          <thead><tr><th>Assessor</th><th>Score</th></tr></thead>
          <tbody>
            ${projectRowsHtml}
            <tr class="total"><td>Total Project</td><td class="num">${row.projectTotal} / ${data.projectMaxTotal}</td></tr>
          </tbody>
        </table>`
            : ""
        }

        <div class="grand-total">
          <span class="label">Overall Total</span>
          <span class="value">${row.grandTotal} / ${grandMax}</span>
        </div>

        <footer>Built and managed by KMF Enterprise</footer>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 150);
  }

  return (
    <button onClick={openSheet} className="text-ink-faint hover:text-accent-ink" title="View/print individual result sheet">
      <FileText size={14} />
    </button>
  );
}
