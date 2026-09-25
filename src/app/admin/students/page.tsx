import Link from "next/link";
import { Users, Plus, Upload, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Toolbar } from "@/components/ui/Toolbar";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStudents } from "@/lib/supabase/students";

export default async function StudentsPage() {
  let students: Awaited<ReturnType<typeof getStudents>>["students"] = [];
  let error: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const result = await getStudents(supabase);
    students = result.students;
    error = result.error;
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Students"
        subtitle={error ? "Unable to load students" : `${students.length} students registered`}
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Students" }]}
        action={
          <div className="flex items-center gap-2">
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
          <Toolbar searchPlaceholder="Search by name or reg. number…" />
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-ink-faint">
                <th className="w-10 px-5 py-3"><input type="checkbox" /></th>
                <th className="px-5 py-3 font-medium">Reg. number</th>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Level</th>
                <th className="w-10 px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-ink-faint">
                    No students yet. <Link href="/admin/students/new" className="underline">Add the first one</Link>.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-bg/50">
                    <td className="px-5 py-3.5"><input type="checkbox" /></td>
                    <td className="px-5 py-3.5 font-medium tabular text-ink">{s.registrationNumber}</td>
                    <td className="px-5 py-3.5 text-ink">{s.fullName}</td>
                    <td className="px-5 py-3.5 text-ink-muted">{s.level}</td>
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
      )}
    </div>
  );
}
