import { Users, Plus, Upload } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Toolbar } from "@/components/ui/Toolbar";
import { students } from "@/lib/mock-data";

export default function StudentsPage() {
  return (
    <div>
      <PageHeader
        icon={Users}
        title="Students"
        subtitle={`${students.length} students registered`}
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Students" }]}
        action={
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-sm font-medium text-ink hover:bg-surface">
              <Upload size={15} /> Bulk import
            </button>
            <button
              className="flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium text-white"
              style={{ background: "var(--accent)" }}
            >
              <Plus size={15} /> Add student
            </button>
          </div>
        }
      />

      <div className="rounded-lg border border-border bg-surface">
        <Toolbar searchPlaceholder="Search by name or reg. number…" />
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-ink-faint">
              <th className="w-10 px-5 py-3"><input type="checkbox" /></th>
              <th className="px-5 py-3 font-medium">Reg. number</th>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Level</th>
              <th className="px-5 py-3 font-medium">Eligible exams</th>
              <th className="w-10 px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0 hover:bg-bg/50">
                <td className="px-5 py-3.5"><input type="checkbox" /></td>
                <td className="px-5 py-3.5 font-medium tabular text-ink">{s.registrationNumber}</td>
                <td className="px-5 py-3.5 text-ink">{s.fullName}</td>
                <td className="px-5 py-3.5 text-ink-muted">{s.level}</td>
                <td className="px-5 py-3.5 text-ink-muted">NGC300</td>
                <td className="px-5 py-3.5 text-ink-faint">···</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
