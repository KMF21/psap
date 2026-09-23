"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { CourseOption, SessionOption } from "@/lib/supabase/exams";
import { createExamAction, type CreateExamState } from "./actions";

export function NewExamForm({ courses, sessions }: { courses: CourseOption[]; sessions: SessionOption[] }) {
  const [state, formAction, isPending] = useActionState<CreateExamState, FormData>(createExamAction, { error: null });
  const [courseMode, setCourseMode] = useState<"existing" | "new">(courses.length > 0 ? "existing" : "new");
  const [sessionMode, setSessionMode] = useState<"existing" | "new">(sessions.length > 0 ? "existing" : "new");
  const [examType, setExamType] = useState<"practical_only" | "practical_and_project">("practical_only");

  return (
    <form action={formAction} className="max-w-2xl space-y-6 rounded-lg border border-border bg-surface p-6">
      {state.error && (
        <div
          className="flex items-start gap-2 rounded-md p-3 text-sm"
          style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <div>
        <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-ink">
          Examination title
        </label>
        <input
          id="title"
          name="title"
          required
          placeholder="e.g. CHE214 Practical Examination 2027"
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
        />
      </div>

      {/* Course */}
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink">Course</p>
        <div className="mb-2 flex gap-4 text-xs text-ink-muted">
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={courseMode === "existing"} onChange={() => setCourseMode("existing")} disabled={courses.length === 0} />
            Use existing
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={courseMode === "new"} onChange={() => setCourseMode("new")} />
            Add new
          </label>
        </div>
        {courseMode === "existing" ? (
          <select name="courseId" className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink">
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.title}
              </option>
            ))}
          </select>
        ) : (
          <div className="flex gap-2">
            <input
              name="newCourseCode"
              placeholder="Code, e.g. NGC300"
              className="w-40 rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
            />
            <input
              name="newCourseTitle"
              placeholder="Course title"
              className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
            />
          </div>
        )}
      </div>

      {/* Academic session */}
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink">Academic session</p>
        <div className="mb-2 flex gap-4 text-xs text-ink-muted">
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={sessionMode === "existing"} onChange={() => setSessionMode("existing")} disabled={sessions.length === 0} />
            Use existing
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={sessionMode === "new"} onChange={() => setSessionMode("new")} />
            Add new
          </label>
        </div>
        {sessionMode === "existing" ? (
          <select name="sessionId" className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink">
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            name="newSessionLabel"
            placeholder="e.g. 2027/2028"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
          />
        )}
      </div>

      {/* Exam type + totals */}
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink">Structure</p>
        <div className="mb-3 flex gap-4 text-xs text-ink-muted">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="examType"
              value="practical_only"
              checked={examType === "practical_only"}
              onChange={() => setExamType("practical_only")}
            />
            Practical only
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="examType"
              value="practical_and_project"
              checked={examType === "practical_and_project"}
              onChange={() => setExamType("practical_and_project")}
            />
            Practical + Project
          </label>
        </div>
        <div className="flex gap-4">
          <div>
            <label htmlFor="practicalTargetTotal" className="mb-1 block text-xs text-ink-muted">
              Practical target total
            </label>
            <input
              id="practicalTargetTotal"
              name="practicalTargetTotal"
              type="number"
              min={1}
              placeholder="e.g. 100"
              className="w-32 rounded-md border border-border bg-bg px-3 py-2 text-sm tabular text-ink placeholder:text-ink-faint"
            />
          </div>
          {examType === "practical_and_project" && (
            <div>
              <label htmlFor="projectMaxTotal" className="mb-1 block text-xs text-ink-muted">
                Project max total
              </label>
              <input
                id="projectMaxTotal"
                name="projectMaxTotal"
                type="number"
                min={1}
                placeholder="e.g. 20"
                className="w-32 rounded-md border border-border bg-bg px-3 py-2 text-sm tabular text-ink placeholder:text-ink-faint"
              />
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          Skills, their mark allocation, and CSA assignment are added on the next screen after the exam is created.
        </p>
      </div>

      <div className="flex items-center gap-2 border-t border-border pt-5">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          style={{ background: "var(--accent)" }}
        >
          {isPending ? "Creating…" : "Create examination"}
        </button>
        <Link href="/admin/exams" className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-bg">
          Cancel
        </Link>
      </div>
    </form>
  );
}
