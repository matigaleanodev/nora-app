import { Pipe, type PipeTransform } from "@angular/core";
import { formatCalendarDate } from "../utils/calendar-date";
@Pipe({ name: "calendarDate" })
export class CalendarDatePipe implements PipeTransform {
  transform(value: string | undefined | null): string {
    return value ? formatCalendarDate(value) : "";
  }
}
