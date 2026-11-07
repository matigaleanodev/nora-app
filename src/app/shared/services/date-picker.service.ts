import { inject, Injectable } from "@angular/core";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { NotificationService } from "./notification.service";
import {
  calendarDateFromLocal,
  calendarDateToLocal,
  isCalendarDate,
} from "../utils/calendar-date";
@Injectable({ providedIn: "root" })
export class DatePickerService {
  private readonly notifications = inject(NotificationService);
  private active = false;
  async pick(value: string): Promise<string | null> {
    return this.open(
      {
        value: isCalendarDate(value) ? calendarDateToLocal(value) : new Date(),
        mode: "date",
      },
      calendarDateFromLocal,
    );
  }
  /** Elige una hora local HH:mm en formato de 24 horas. */
  async pickTime(value: string): Promise<string | null> {
    const [hours, minutes] = /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
      ? value.split(":").map(Number)
      : [new Date().getHours(), 0];
    const initial = new Date();
    initial.setHours(hours!, minutes!, 0, 0);
    return this.open(
      { value: initial, mode: "time", is24Hour: true },
      (selected) =>
        `${String(selected.getHours()).padStart(2, "0")}:${String(selected.getMinutes()).padStart(2, "0")}`,
    );
  }
  private async open(
    options: { value: Date; mode: "date" | "time"; is24Hour?: boolean },
    format: (selected: Date) => string,
  ): Promise<string | null> {
    if (this.active) return null;
    this.active = true;
    try {
      return await new Promise<string | null>((resolve, reject) => {
        DateTimePickerAndroid.open({
          ...options,
          onError: reject,
          onValueChange: (_event, selected) => resolve(format(selected)),
          onDismiss: () => resolve(null),
        });
      });
    } catch {
      this.notifications.danger(
        "No pudimos abrir el calendario. Volvé a intentarlo.",
      );
      return null;
    } finally {
      this.active = false;
    }
  }
}
