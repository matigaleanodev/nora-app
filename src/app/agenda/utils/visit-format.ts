import {
  calendarDateFromLocal,
  calendarDateToLocal,
  formatCalendarDate,
} from "../../shared/utils/calendar-date";
import {
  VISIT_KIND_LABELS,
  VisitStatus,
  type Visit,
} from "../models/visit.model";

/** Día siguiente de una fecha de calendario, sin pasar por UTC. */
export function nextCalendarDate(value: string): string {
  const date = calendarDateToLocal(value);
  date.setDate(date.getDate() + 1);
  return calendarDateFromLocal(date);
}
/** Orden cronológico; sin hora, la visita va antes que las del mismo día con hora. */
export const compareVisits = (a: Visit, b: Visit): number =>
  `${a.date} ${a.time ?? "00:00"} ${a.title}`.localeCompare(
    `${b.date} ${b.time ?? "00:00"} ${b.title}`,
  );
export function describeWhen(visit: Visit, today: string): string {
  const day =
    visit.date === today
      ? "Hoy"
      : visit.date === nextCalendarDate(today)
        ? "Mañana"
        : formatCalendarDate(visit.date);
  return visit.time ? `${day} · ${visit.time} hs` : day;
}
/** Línea secundaria: tipo, cliente y presupuesto vinculados. */
export function describeVisit(visit: Visit): string {
  return [
    VISIT_KIND_LABELS[visit.kind],
    visit.customerName,
    visit.estimateNumber ? `Presupuesto ${visit.estimateNumber}` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
}
export interface AgendaGroups {
  readonly overdue: readonly Visit[];
  readonly today: readonly Visit[];
  readonly upcoming: readonly Visit[];
  readonly done: readonly Visit[];
}
export function groupVisits(
  visits: readonly Visit[],
  today: string,
  doneLimit = 20,
): AgendaGroups {
  const pending = visits
    .filter((visit) => visit.status === VisitStatus.Pending)
    .sort(compareVisits);
  return {
    overdue: pending.filter((visit) => visit.date < today),
    today: pending.filter((visit) => visit.date === today),
    upcoming: pending.filter((visit) => visit.date > today),
    done: visits
      .filter((visit) => visit.status === VisitStatus.Done)
      .sort((a, b) => compareVisits(b, a))
      .slice(0, doneLimit),
  };
}
