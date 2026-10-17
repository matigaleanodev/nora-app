import { Component, input, output, signal } from "@angular/core";
import { Pressable, Text, View } from "@ng-native/components";
import { IconComponent } from "../icon/icon.component";

@Component({
  selector: "nora-navigation-row",
  imports: [Pressable, Text, View, IconComponent],
  template: `<pressable
    class="navigation-row flex-row items-center gap-3"
    [class.control-pressed]="isPressed()"
    accessibilityRole="button"
    [accessibilityLabel]="text()"
    [disabled]="disabled()"
    [accessibilityState]="{ disabled: disabled() }"
    (pressIn)="isPressed.set(true)"
    (pressOut)="isPressed.set(false)"
    (press)="pressed.emit()"
  >
    <view class="flex-1 gap-1"
      ><text class="task-title">{{ text() }}</text>
      @if (detail()) {
        <text class="footnote">{{ detail() }}</text>
      }</view
    ><nora-icon name="bootstrapChevronRight" [size]="20" />
  </pressable>`,
})
export class NavigationRowComponent {
  readonly text = input.required<string>();
  readonly detail = input("");
  readonly disabled = input(false);
  readonly pressed = output<void>();
  protected readonly isPressed = signal(false);
}
