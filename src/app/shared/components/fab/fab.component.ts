import { Component, input, output } from "@angular/core";
import { IconComponent } from "../icon/icon.component";
import { Pressable } from "@ng-native/components";
@Component({
  selector: "nora-fab",
  imports: [Pressable, IconComponent],
  template: `<pressable
    [hitSlop]="8"
    [android_ripple]="{ color: '#ffffff33', borderless: false }"
    [accessibilityState]="{ disabled: disabled() }"
    accessibilityRole="button"
    [accessibilityLabel]="label()"
    [disabled]="disabled()"
    class="fab items-center justify-center"
    [style]="{ margin: 8 }"
    [class.button-disabled]="disabled()"
    (press)="pressed.emit()"
    ><nora-icon name="bootstrapPlusLg" [size]="24" color="#ffffff"
  /></pressable>`,
  styles:
    ":host { position: absolute; right: 16px; bottom: 12px; width: 72px; height: 72px; }",
})
export class FabComponent {
  readonly label = input.required<string>();
  readonly disabled = input(false);
  readonly pressed = output<void>();
}
