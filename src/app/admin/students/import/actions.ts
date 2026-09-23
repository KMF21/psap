"use server";

import Papa from "papaparse";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { bulkImportStudents } from "@/lib/supabase/students";

export interface ImportState {
  error: string | null;
  result: { inserted: number; skipped: number; invalidRowCount: number } | null;
}

// Accepts a few common header spellings so a CSV exported from Excel/Sheets
// with slightly different column names still works without the person
// having to rename anything first.
function normalizeHeader(header: string): "registrationNumber" | "fullName" | "level" | null {
  const key = header.trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (["regnumber", "registrationnumber", "regno", "regnum"].includes(key)) return "registrationNumber";
  if (["fullname", "name", "studentname"].includes(key)) return "fullName";
  if (["level"].includes(key)) return "level";
  return null;
}

export async function importStudentsAction(_prevState: ImportState, formData: FormData): Promise<ImportState> {
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a CSV file to upload.", result: null };
  }

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });

  if (parsed.errors.length > 0) {
    return { error: `Couldn't parse the CSV file: ${parsed.errors[0].message}`, result: null };
  }
  if (!parsed.meta.fields || parsed.meta.fields.length === 0) {
    return { error: "The CSV file has no header row.", result: null };
  }

  const headerMap = new Map<string, "registrationNumber" | "fullName" | "level">();
  for (const h of parsed.meta.fields) {
    const normalized = normalizeHeader(h);
    if (normalized) headerMap.set(h, normalized);
  }

  if (![...headerMap.values()].includes("registrationNumber") || ![...headerMap.values()].includes("fullName")) {
    return {
      error: 'The CSV needs at least a registration number column and a full name column (e.g. "Registration Number", "Full Name").',
      result: null,
    };
  }

  const rows: { registrationNumber: string; fullName: string; level: string }[] = [];
  let invalidRowCount = 0;

  for (const record of parsed.data) {
    const row: Partial<Record<"registrationNumber" | "fullName" | "level", string>> = {};
    for (const [original, normalized] of headerMap.entries()) {
      row[normalized] = (record[original] ?? "").trim();
    }
    if (!row.registrationNumber || !row.fullName) {
      invalidRowCount += 1;
      continue;
    }
    rows.push({ registrationNumber: row.registrationNumber, fullName: row.fullName, level: row.level ?? "" });
  }

  if (rows.length === 0) {
    return { error: "No valid rows found — every row needs at least a registration number and a full name.", result: null };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { inserted, skipped, error } = await bulkImportStudents(supabase, rows);

    if (error) return { error, result: null };

    return { error: null, result: { inserted, skipped, invalidRowCount } };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error connecting to the database.", result: null };
  }
}
