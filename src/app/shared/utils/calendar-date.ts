/** Una fecha de calendario no representa un instante ni tiene huso horario. */
export function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]),
    month = Number(match[2]),
    day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return (
    year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]
  );
}
export function formatCalendarDate(value: string): string {
  if (!isCalendarDate(value)) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
/** Sólo el selector nativo necesita Date; se toman sus componentes locales, nunca UTC. */
export function calendarDateFromLocal(value: Date): string {
  const year = String(value.getFullYear()).padStart(4, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
export function calendarDateToLocal(value: string): Date {
  if (!isCalendarDate(value)) throw new Error("Fecha inválida.");
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(2000, month - 1, day, 12);
  date.setFullYear(year);
  return date;
}
