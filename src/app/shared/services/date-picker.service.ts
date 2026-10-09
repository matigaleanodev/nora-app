import { inject, Injectable } from "@angular/core";
import { NotificationService } from "./notification.service";
import {
  calendarDateFromLocal,
  calendarDateToLocal,
  isCalendarDate,
} from "../utils/calendar-date";
@Injectable({ providedIn: "root" })
export class DatePickerService {
  private readonly notifications = inject(NotificationService);
  async pick(value: string): Promise<string | null> {
    try {
      const { DateTimePickerAndroid } =
        await import("@react-native-community/datetimepicker");
      return await new Promise<string | null>((resolve, reject) => {
        DateTimePickerAndroid.open({
          value: isCalendarDate(value)
            ? calendarDateToLocal(value)
            : new Date(),
          mode: "date",
          onError: reject,
          onChange: (event, selected) =>
            resolve(
              event.type === "set" && selected
                ? calendarDateFromLocal(selected)
                : null,
            ),
        });
      });
    } catch {
      this.notifications.danger(
        "No pudimos abrir el calendario. Volvé a intentarlo.",
      );
      return null;
    }
  }
}
