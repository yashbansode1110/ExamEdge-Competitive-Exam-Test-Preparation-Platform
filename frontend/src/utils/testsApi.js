/** GET /api/tests (or legacy { items } / { tests }) → array of test docs */
export function normalizeTestsListResponse(data) {
  if (!data || typeof data !== "object") return [];
  const raw = data.items ?? data.tests ?? data.data;
  return Array.isArray(raw) ? raw : [];
}
