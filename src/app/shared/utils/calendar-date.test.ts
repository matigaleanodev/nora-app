import { expect, test } from "vitest";
import {
  isCalendarDate,
  calendarDateFromLocal,
  calendarDateToLocal,
  formatCalendarDate,
} from "./calendar-date";

test.each([0, 12, 23])(
  "conserva el día 15 elegido a las %s horas locales",
  (hour) => {
    const selected = new Date(2026, 9, 15, hour, 59);
    expect(calendarDateFromLocal(selected)).toBe("2026-10-15");
    expect(calendarDateFromLocal(calendarDateToLocal("2026-10-15"))).toBe(
      "2026-10-15",
    );
    expect(formatCalendarDate("2026-10-15")).toBe("15/10/2026");
  },
);
test.each([
  "2026-02-30",
  "2025-02-29",
  "2026-13-01",
  "15/10/2026",
  "0000-01-01",
])("rechaza la fecha inexistente o mal formada %s", (value) => {
  expect(isCalendarDate(value)).toBe(false);
  expect(formatCalendarDate(value)).toBe("");
});
test("acepta años bisiestos sin transformar el string en un instante", () => {
  expect(isCalendarDate("2028-02-29")).toBe(true);
  expect(isCalendarDate("2000-02-29")).toBe(true);
  expect(isCalendarDate("1900-02-29")).toBe(false);
});
