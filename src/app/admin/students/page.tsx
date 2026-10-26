import Link from "next/link";
import { Users, Plus, Upload, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStudentList, STUDENTS_PAGE_SIZE, type StudentListResult } from "@/lib/supabase/students";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; level?: string; exam?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  let result: StudentListResult = { students: [], total: 0, levels: [], exams: [], error: null };
  let error: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    result = await getStudentList(supabase, { q: sp.q, level: sp.level, examId: sp.exam, page });
    error = result.error;
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }
  const { students, total } = result;
  const filtered = Boolean(sp.q || sp.level || sp.exam);
  const pageCount = Math.max(1, Math.ceil(total / STUDENTS_PAGE_SIZE));
  const firstShown = total === 0 ? 0 : (page - 1) * STUDENTS_PAGE_SIZE + 1;
  const lastShown = (page - 1) * STUDENTS_PAGE_SIZE + students.length;

  function pageHref(n: number) {
    const p = new URLSearchParams();
    if (sp.q) p.set("q", sp.q);
    if (sp.level) p.set("level", sp.level);
    if (sp.exam) p.set("exam", sp.exam);
    if (n > 1) p.set("page", String(n));
    const qs = p.toString();
    return qs ? `/admin/students?${qs}` : "/admin/students";
  }

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Students"
        subtitle={error ? "Unable to load students" : filtered ? `${total} matching students` : `${total} students registered`}
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Students" }]}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/students/import"
              className="flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-sm font-medium text-ink hover:bg-surface"
            >
              <Upload size={15} /> Bulk import
            </Link>
            <Link
              href="/admin/students/new"
              className="flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium text-white"
              style={{ background: "var(--accent)" }}
            >
              <Plus size={15} /> Add student
            </Link>
          </div>
        }
      />

      {error ? (
        <div
          className="flex items-start gap-3 rounded-lg border p-5 text-sm"
          style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t load students from the database.</p>
            <p className="mt-1 opacity-90">{error}</p>
            <p className="mt-2 text-xs opacity-75">
              If this says permission denied, your own admin user may not exist yet in Supabase&apos;s{" "}
              <code>users</code> table — see <code>003_manual_admin_user.sql</code>.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface">
          <FilterBar
            searchPlaceholder="Search name or reg. number…"
            selects={[
              { param: "level", label: "All levels", options: result.levels.map((l) => ({ value: l, label: l })) },
              { param: "exam", label: "All examinations", options: result.exams.map((e) => ({ value: e.id, label: e.label })) },
            ]}
            resultNote={total > 0 ? `Showing ${firstShown}–${lastShown} of ${total}` : undefined}
          />
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-ink-faint">
                <th className="px-5 py-3 font-medium">Reg. number</th>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Level</th>
                <th className="px-5 py-3 text-right font-medium">Exams</th>
                <th className="w-10 px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-ink-faint">
                    {filtered ? "No students match these filters." : <>No students yet. <Link href="/admin/students/new" className="underline">Add the first one</Link>.</>}
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-bg/50">
                    <td className="px-5 py-3.5 font-medium tabular text-ink">{s.registrationNumber}</td>
                    <td className="px-5 py-3.5 text-ink">
                      <Link href={`/admin/students/${s.id}`} className="font-medium hover:text-accent-ink hover:underline">{s.fullName}</Link>
                    </td>
                    <td className="px-5 py-3.5 text-ink-muted">{s.level}</td>
                    <td className="px-5 py-3.5 text-right tabular text-ink-muted">{s.examCount}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Link href={`/admin/students/${s.id}/edit`} className="text-xs font-medium text-ink-muted hover:text-accent-ink">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
          {pageCount > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm sm:px-5">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className="rounded-md border border-border px-3.5 py-2 font-medium text-ink hover:bg-bg">← Previous</Link>
              ) : (
                <span className="rounded-md border border-border px-3.5 py-2 font-medium text-ink-faint opacity-50">← Previous</span>
              )}
              <span className="text-xs text-ink-muted">Page {page} of {pageCount}</span>
              {page < pageCount ? (
                <Link href={pageHref(page + 1)} className="rounded-md border border-border px-3.5 py-2 font-medium text-ink hover:bg-bg">Next →</Link>
              ) : (
                <span className="rounded-md border border-border px-3.5 py-2 font-medium text-ink-faint opacity-50">Next →</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
