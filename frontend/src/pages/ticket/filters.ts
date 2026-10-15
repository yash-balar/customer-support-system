export function updateTicketFilters(
  current: URLSearchParams,
  key: string,
  value: string,
): URLSearchParams {
  const next = new URLSearchParams(current);
  if (value) next.set(key, value);
  else next.delete(key);
  if (key !== "page") next.delete("page");
  return next;
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function updateTicketDateFilter(
  current: URLSearchParams,
  key: "startDate" | "endDate",
  value: string,
  maxDate: string,
): URLSearchParams {
  const safeValue = value > maxDate ? maxDate : value;
  const next = updateTicketFilters(current, key, safeValue);
  const startDate = next.get("startDate") ?? "";
  const endDate = next.get("endDate") ?? "";

  if (startDate && endDate && startDate > endDate) {
    next.set(key === "startDate" ? "endDate" : "startDate", safeValue);
  }

  return next;
}
