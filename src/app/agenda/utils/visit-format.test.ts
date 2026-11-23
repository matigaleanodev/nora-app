import { describe, expect, test } from "vitest";
import { VisitKind, VisitStatus, type Visit } from "../models/visit.model";
import {
  compareVisits,
  describeVisit,
  describeWhen,
  groupVisits,
  nextCalendarDate,
} from "./visit-format";

const visit = (overrides: Partial<Visit>): Visit => ({
  id: "6f1c2f4e-2b1a-4c58-9d0e-1a2b3c4d5e6f",
  title: "Visita",
  kind: VisitKind.Visit,
  status: VisitStatus.Pending,
  date: "2026-11-06",
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
  ...overrides,
});

describe("visit-format", () => {
  test("calcula el día siguiente atravesando fin de mes y de año", () => {
    expect(nextCalendarDate("2026-11-06")).toBe("2026-11-07");
    expect(nextCalendarDate("2026-11-30")).toBe("2026-12-01");
    expect(nextCalendarDate("2026-12-31")).toBe("2027-01-01");
  });

  test("describe cuándo es la visita con Hoy, Mañana o la fecha", () => {
    const today = "2026-11-06";
    expect(describeWhen(visit({}), today)).toBe("Hoy");
    expect(describeWhen(visit({ time: "09:30" }), today)).toBe(
      "Hoy · 09:30 hs",
    );
    expect(describeWhen(visit({ date: "2026-11-07" }), today)).toBe("Mañana");
    expect(describeWhen(visit({ date: "2026-11-20" }), today)).toBe(
      "20/11/2026",
    );
  });

  test("describe tipo, cliente y presupuesto vinculados", () => {
    expect(
      describeVisit(
        visit({
          kind: VisitKind.FollowUp,
          customerName: "Ana",
          estimateNumber: "P-0001",
        }),
      ),
    ).toBe("Seguimiento · Ana · Presupuesto P-0001");
    expect(describeVisit(visit({}))).toBe("Visita");
  });

  test("ordena por fecha y hora, y agrupa vencidas, de hoy, próximas y hechas", () => {
    const overdue = visit({ id: "a", date: "2026-11-01" });
    const early = visit({ id: "b", time: "08:00" });
    const late = visit({ id: "c", time: "18:00" });
    const next = visit({ id: "d", date: "2026-11-10" });
    const done = visit({ id: "e", status: VisitStatus.Done });
    expect(compareVisits(early, late)).toBeLessThan(0);
    const groups = groupVisits(
      [next, late, done, overdue, early],
      "2026-11-06",
    );
    expect(groups.overdue.map((value) => value.id)).toEqual(["a"]);
    expect(groups.today.map((value) => value.id)).toEqual(["b", "c"]);
    expect(groups.upcoming.map((value) => value.id)).toEqual(["d"]);
    expect(groups.done.map((value) => value.id)).toEqual(["e"]);
  });
});
