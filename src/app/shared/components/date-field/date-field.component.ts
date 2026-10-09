import { Component, inject, input, output } from "@angular/core";
import { Pressable, Text, View } from "@ng-native/components";
import { CalendarDatePipe } from "../../pipes/calendar-date.pipe";
import { DatePickerService } from "../../services/date-picker.service";
import { IconComponent } from "../icon/icon.component";
@Component({
  selector: "nora-date-field",
  imports: [Pressable, Text, View, CalendarDatePipe, IconComponent],
  template: `<view class="gap-2">
    <text class="field-label">{{ label() }}</text>
    <view class="date-input flex-row items-center">
      <pressable
        class="date-input-value flex-1 justify-center"
        accessibilityRole="button"
        [accessibilityLabel]="label()"
        [accessibilityState]="{ disabled: disabled() }"
        [disabled]="disabled()"
        (press)="choose()"
      >
        <text class="body-text">{{
          (value() | calendarDate) || "Ej.: 15/12/2026 · seleccionar fecha"
        }}</text>
      </pressable>
      @if (value()) {
        <pressable
          class="date-input-clear items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Quitar fecha"
          [accessibilityState]="{ disabled: disabled() }"
          [disabled]="disabled()"
          (press)="valueChange.emit('')"
        >
          <nora-icon name="bootstrapTrash3" [size]="20" />
        </pressable>
      }
    </view>
  </view>`,
})
export class DateFieldComponent {
  readonly label = input.required<string>();
  readonly value = input("");
  readonly disabled = input(false);
  readonly valueChange = output<string>();
  private readonly picker = inject(DatePickerService);
  protected async choose(): Promise<void> {
    const value = await this.picker.pick(this.value());
    if (value !== null) this.valueChange.emit(value);
  }
}
