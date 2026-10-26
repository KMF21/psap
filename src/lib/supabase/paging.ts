/**
 * Supabase/PostgREST caps every response at 1,000 rows (the project default),
 * silently truncating bigger result sets. Anything that must see *all* rows —
 * the eligibility picker, an exam's results — reads through this helper, which
 * walks the table in pages until it runs out.
 */
export async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000,
): Promise<{ data: T[]; error: string | null }> {
  const all: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) return { data: [], error: error.message };
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return { data: all, error: null };
}
