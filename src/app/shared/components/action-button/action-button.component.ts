import { Component, input, output, signal } from "@angular/core";
import { Pressable, Text } from "@ng-native/components";
@Component({
  selector: "nora-button",
  imports: [Pressable, Text],
  template: `
    <pressable
      (pressIn)="isPressed.set(true)"
      (pressOut)="isPressed.set(false)"
      [class.control-pressed]="isPressed()"
      accessibilityRole="button"
      [accessibilityLabel]="label() || text()"
      [disabled]="disabled()"
      [accessibilityState]="{ disabled: disabled(), selected: selected() }"
      (press)="pressed.emit()"
      class="button-base"
      [class.secondary-button]="
        variant() === 'secondary' || variant() === 'danger'
      "
      [class.primary-button]="variant() === 'primary'"
      [class.choice-button]="variant() === 'choice'"
      [class.choice-active]="selected()"
      [class.back-button]="variant() === 'back'"
      [class.button-disabled]="disabled()"
    >
      <text
        [class.action-label]="variant() !== 'primary' && variant() !== 'danger'"
        [class.primary-label]="variant() === 'primary'"
        [class.danger-label]="variant() === 'danger'"
        >{{ text() }}</text
      >
    </pressable>
  `,
})
export class ActionButtonComponent {
  readonly text = input.required<string>();
  readonly label = input("");
  readonly variant = input<
    "primary" | "secondary" | "danger" | "choice" | "back"
  >("secondary");
  readonly selected = input(false);
  readonly disabled = input(false);
  readonly pressed = output<void>();
  protected readonly isPressed = signal(false);
}
