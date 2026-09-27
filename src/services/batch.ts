/**
 * PostgREST sends `.in("id", ids)` filters in the URL. With hundreds of
 * UUIDs (37 characters each) the URL passes the server's length limit and
 * the request fails, so large lists are queried in batches.
 */
export const IN_FILTER_BATCH_SIZE = 150;

export function chunk<T>(items: T[], size = IN_FILTER_BATCH_SIZE): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}
