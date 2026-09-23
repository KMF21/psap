import { Search, SlidersHorizontal, FileDown, FileSpreadsheet } from "lucide-react";

export function Toolbar({
  searchPlaceholder,
  showExport = false,
  rightSlot,
}: {
  searchPlaceholder: string;
  showExport?: boolean;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="w-64 rounded-md border border-border bg-bg py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:bg-surface"
          />
        </div>
        <button className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-ink-muted hover:bg-bg">
          <SlidersHorizontal size={15} />
        </button>
      </div>
      <div className="flex items-center gap-2">
        {rightSlot}
        {showExport && (
          <>
            <button className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-ink-muted hover:bg-bg">
              <FileDown size={14} /> Export PDF
            </button>
            <button className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-ink-muted hover:bg-bg">
              <FileSpreadsheet size={14} /> Export Excel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
