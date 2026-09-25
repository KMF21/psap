import type { SupabaseClient } from "@supabase/supabase-js";
import type { Student } from "@/lib/types";

// Postgres columns are snake_case (matching 001_init.sql); our app types
// are camelCase (matching mock-data.ts) so pages didn't need to change
// shape when swapping from mock data to real queries. This file is the
// only place that translates between the two.

function rowToStudent(row: {
  id: string;
  registration_number: string;
  full_name: string;
  level: string | null;
  photo_url: string | null;
}): Student {
  return {
    id: row.id,
    registrationNumber: row.registration_number,
    fullName: row.full_name,
    level: row.level ?? "",
    photoUrl: row.photo_url ?? undefined,
  };
}

export async function getStudents(supabase: SupabaseClient): Promise<{ students: Student[]; error: string | null }> {
  const { data, error } = await supabase
    .from("students")
    .select("id, registration_number, full_name, level, photo_url")
    .order("full_name", { ascending: true });

  if (error) {
    return { students: [], error: error.message };
  }
  return { students: (data ?? []).map(rowToStudent), error: null };
}

export async function getStudentById(
  supabase: SupabaseClient,
  studentId: string,
): Promise<{ student: Student | null; error: string | null }> {
  const { data, error } = await supabase
    .from("students")
    .select("id, registration_number, full_name, level, photo_url")
    .eq("id", studentId)
    .maybeSingle();

  if (error) return { student: null, error: error.message };
  if (!data) return { student: null, error: null };
  return { student: rowToStudent(data), error: null };
}

export async function updateStudent(
  supabase: SupabaseClient,
  studentId: string,
  input: { registrationNumber: string; fullName: string; level: string },
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("students")
    .update({
      registration_number: input.registrationNumber,
      full_name: input.fullName,
      level: input.level || null,
    })
    .eq("id", studentId);

  if (error) {
    if (error.code === "23505") {
      return { error: `A student with registration number "${input.registrationNumber}" already exists.` };
    }
    return { error: error.message };
  }
  return { error: null };
}

export async function createStudent(
  supabase: SupabaseClient,
  input: { registrationNumber: string; fullName: string; level: string },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("students").insert({
    registration_number: input.registrationNumber,
    full_name: input.fullName,
    level: input.level || null,
  });

  if (error) {
    // Postgres unique_violation on registration_number
    if (error.code === "23505") {
      return { error: `A student with registration number "${input.registrationNumber}" already exists.` };
    }
    return { error: error.message };
  }
  return { error: null };
}

export interface BulkImportResult {
  inserted: number;
  skipped: number;
  error: string | null;
}

/**
 * Deliberately not a Postgres upsert with ignore-duplicates — that relies
 * on subtle PostgREST return-shape behavior that's easy to get wrong.
 * Checking existing registration numbers first, then inserting only the
 * new ones, is simple to reason about and simple to test correctly.
 */
export async function bulkImportStudents(
  supabase: SupabaseClient,
  rows: { registrationNumber: string; fullName: string; level: string }[],
): Promise<BulkImportResult> {
  if (rows.length === 0) return { inserted: 0, skipped: 0, error: null };

  const regNumbers = rows.map((r) => r.registrationNumber);
  const { data: existing, error: lookupError } = await supabase
    .from("students")
    .select("registration_number")
    .in("registration_number", regNumbers);

  if (lookupError) return { inserted: 0, skipped: 0, error: lookupError.message };

  const existingSet = new Set((existing ?? []).map((e) => e.registration_number));
  const toInsert = rows.filter((r) => !existingSet.has(r.registrationNumber));
  const skipped = rows.length - toInsert.length;

  if (toInsert.length === 0) return { inserted: 0, skipped, error: null };

  const { error: insertError } = await supabase.from("students").insert(
    toInsert.map((r) => ({
      registration_number: r.registrationNumber,
      full_name: r.fullName,
      level: r.level || null,
    })),
  );

  if (insertError) return { inserted: 0, skipped, error: insertError.message };
  return { inserted: toInsert.length, skipped, error: null };
}
