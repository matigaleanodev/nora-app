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
    if (this.active) return null;
    this.active = true;
    try {
      return await new Promise<string | null>((resolve, reject) => {
        DateTimePickerAndroid.open({
          value: isCalendarDate(value)
            ? calendarDateToLocal(value)
            : new Date(),
          mode: "date",
          onError: reject,
          onValueChange: (_event, selected) =>
            resolve(calendarDateFromLocal(selected)),
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
