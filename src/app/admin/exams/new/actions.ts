"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { findOrCreateCourse, findOrCreateSession, createExam } from "@/lib/supabase/exams";

export interface CreateExamState {
  error: string | null;
}

export async function createExamAction(_prevState: CreateExamState, formData: FormData): Promise<CreateExamState> {
  const title = String(formData.get("title") ?? "").trim();
  const examType = String(formData.get("examType") ?? "practical_only") as "practical_only" | "practical_and_project";
  const practicalTargetTotal = Number(formData.get("practicalTargetTotal") ?? 0);
  const projectMaxTotal = examType === "practical_and_project" ? Number(formData.get("projectMaxTotal") ?? 0) : 0;

  const courseId = String(formData.get("courseId") ?? "");
  const newCourseCode = String(formData.get("newCourseCode") ?? "").trim();
  const newCourseTitle = String(formData.get("newCourseTitle") ?? "").trim();

  const sessionId = String(formData.get("sessionId") ?? "");
  const newSessionLabel = String(formData.get("newSessionLabel") ?? "").trim();

  if (!title) return { error: "Exam title is required." };
  if (!practicalTargetTotal || practicalTargetTotal <= 0) return { error: "Practical target total must be greater than 0." };
  if (examType === "practical_and_project" && (!projectMaxTotal || projectMaxTotal <= 0)) {
    return { error: "Project max total must be greater than 0 for a practical + project exam." };
  }
  if (!courseId && !newCourseCode) return { error: "Select an existing course or enter a new course code." };
  if (!sessionId && !newSessionLabel) return { error: "Select an existing academic session or enter a new one." };

  let examId: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();

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
      practicalTargetTotal,
      projectMaxTotal,
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
