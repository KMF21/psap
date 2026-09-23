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
