import { ClipboardList, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCourseOptions, getLevelOptions, getSessionOptions } from "@/lib/supabase/exams";
import { NewExamForm } from "./NewExamForm";

export default async function NewExamPage() {
  let courses: Awaited<ReturnType<typeof getCourseOptions>> = [];
  let sessions: Awaited<ReturnType<typeof getSessionOptions>> = [];
  let levels: string[] = [];
  let error: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const [c, s, l] = await Promise.all([getCourseOptions(supabase), getSessionOptions(supabase), getLevelOptions(supabase)]);
    courses = c;
    sessions = s;
    levels = l.levels.map((x) => x.level);
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }

  return (
    <div>
      <PageHeader
        icon={ClipboardList}
        title="Create examination"
        breadcrumb={[
          { label: "Dashboard", href: "/admin" },
          { label: "Examinations", href: "/admin/exams" },
          { label: "Create examination" },
        ]}
      />

      {error ? (
        <div
          className="flex items-start gap-3 rounded-lg border p-5 text-sm"
          style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t load courses and sessions.</p>
            <p className="mt-1 opacity-90">{error}</p>
          </div>
        </div>
      ) : (
        <NewExamForm courses={courses} sessions={sessions} levels={levels} />
      )}
    </div>
  );
}
