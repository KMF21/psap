"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { updateStudent } from "@/lib/supabase/students";

export interface EditStudentState {
  error: string | null;
}

export async function editStudentAction(
  studentId: string,
  _prevState: EditStudentState,
  formData: FormData,
): Promise<EditStudentState> {
  const registrationNumber = String(formData.get("registrationNumber") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const level = String(formData.get("level") ?? "").trim();

  if (!registrationNumber || !fullName) {
    return { error: "Registration number and full name are required." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await updateStudent(supabase, studentId, { registrationNumber, fullName, level });
    if (error) return { error };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error connecting to the database." };
  }

  redirect("/admin/students");
}
