export function getAcademicYear(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  if (month >= 7) {
    return `${year}-${String((year + 1) % 100).padStart(2, "0")}`;
  }
  return `${year - 1}-${String(year % 100).padStart(2, "0")}`;
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString();
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}
