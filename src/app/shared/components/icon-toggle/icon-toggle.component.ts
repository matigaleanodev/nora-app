import { Component, input, output } from "@angular/core";
import { Pressable, View } from "@ng-native/components";
import { IconComponent } from "../icon/icon.component";
@Component({
  selector: "nora-icon-toggle",
  imports: [Pressable, View, IconComponent],
  template: `<pressable
    class="icon-toggle flex-row items-center justify-center gap-1"
    accessibilityRole="checkbox"
    [accessibilityLabel]="label()"
    [accessibilityState]="{ checked: checked(), disabled: disabled() }"
    [disabled]="disabled()"
    [class.choice-active]="checked()"
    [class.button-disabled]="disabled()"
    (press)="checkedChange.emit(!checked())"
  >
    <nora-icon name="bootstrapWhatsapp" [size]="24" />
    <view
      pointerEvents="none"
      class="toggle-check items-center justify-center"
      [class.task-check-done]="checked()"
    >
      @if (checked()) {
        <nora-icon name="bootstrapCheckLg" [size]="12" color="#ffffff" />
      }
    </view>
  </pressable>`,
})
export class IconToggleComponent {
  readonly label = input.required<string>();
  readonly checked = input(false);
  readonly disabled = input(false);
  readonly checkedChange = output<boolean>();
}
