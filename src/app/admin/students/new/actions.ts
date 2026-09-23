"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createStudent } from "@/lib/supabase/students";

export async function createStudentAction(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const registrationNumber = String(formData.get("registrationNumber") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const level = String(formData.get("level") ?? "").trim();

  if (!registrationNumber || !fullName) {
    return { error: "Registration number and full name are required." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await createStudent(supabase, { registrationNumber, fullName, level });

  if (error) {
    return { error };
  }

  redirect("/admin/students");
}
