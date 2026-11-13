"use server";

import { redirect } from "next/navigation";
import { adminContext } from "@/lib/admin-action";
import { findOrCreateCourse, findOrCreateSession, createExam } from "@/lib/supabase/exams";

export interface CreateExamState {
  error: string | null;
}

export async function createExamAction(_prevState: CreateExamState, formData: FormData): Promise<CreateExamState> {
  const title = String(formData.get("title") ?? "").trim();
  const examType = String(formData.get("examType") ?? "practical_only") as "practical_only" | "practical_and_project";
  const drawsPerStudent = Number(formData.get("drawsPerStudent") ?? 3);

  const courseId = String(formData.get("courseId") ?? "");
  const newCourseCode = String(formData.get("newCourseCode") ?? "").trim();
  const newCourseTitle = String(formData.get("newCourseTitle") ?? "").trim();

  const sessionId = String(formData.get("sessionId") ?? "");
  const newSessionLabel = String(formData.get("newSessionLabel") ?? "").trim();

  if (!title) return { error: "Exam title is required." };
  if (examType !== "practical_only" && examType !== "practical_and_project") return { error: "Choose the exam structure." };
  if (!Number.isInteger(drawsPerStudent) || drawsPerStudent < 0 || drawsPerStudent > 20) {
    return { error: "Skills drawn per student must be a whole number from 0 to 20." };
  }
  if (!courseId && !newCourseCode) return { error: "Select an existing course or enter a new course code." };
  if (!sessionId && !newSessionLabel) return { error: "Select an existing academic session or enter a new one." };

  let examId: string | null = null;

  try {
    const ctx = await adminContext();
    if (!ctx.ok) return { error: ctx.error };
    const supabase = ctx.supabase;

    let finalCourseId = courseId;
    if (!finalCourseId) {
      if (!newCourseTitle) return { error: "Enter a title for the new course." };
      const { id, error } = await findOrCreateCourse(supabase, newCourseCode, newCourseTitle);
      if (error || !id) return { error: error ?? "Failed to create course." };
      finalCourseId = id;
    }

    let finalSessionId = sessionId;
    if (!finalSessionId) {
      const { id, error } = await findOrCreateSession(supabase, newSessionLabel);
      if (error || !id) return { error: error ?? "Failed to create academic session." };
      finalSessionId = id;
    }

    const result = await createExam(supabase, {
      courseId: finalCourseId,
      academicSessionId: finalSessionId,
      title,
      examType,
      drawsPerStudent,
    });

    if (result.error || !result.examId) return { error: result.error ?? "Failed to create exam." };
    examId = result.examId;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error connecting to the database." };
  }

  // redirect() throws internally — it must happen outside the try/catch
  // above, or Next.js's own redirect mechanism gets swallowed as a generic
  // error instead of actually navigating.
  redirect(`/admin/exams/${examId}`);
}
