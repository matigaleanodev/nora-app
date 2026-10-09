import { readNativeText } from "../../utils/native-text";
import { Component, input, output } from "@angular/core";
import {
  Text,
  TextInput,
  View,
  type KeyboardType,
} from "@ng-native/components";

@Component({
  selector: "nora-field",
  imports: [Text, TextInput, View],
  template: `
    <view class="gap-2">
      <text class="field-label"
        >{{ label()
        }}{{ required() && !label().includes("*") ? " *" : "" }}</text
      >
      <text-input
        class="form-input"
        [class.form-multiline]="multiline()"
        [accessibilityLabel]="label()"
        [value]="value()"
        (changeText)="commit($event)"
        (endEditing)="commit($event)"
        [autoComplete]="autoComplete()"
        [importantForAutofill]="autoComplete() === 'off' ? 'no' : 'yes'"
        [autoCorrect]="false"
        [showSoftInputOnFocus]="true"
        [placeholder]="placeholder()"
        [keyboardType]="keyboard()"
        [multiline]="multiline()"
        [disabled]="disabled()"
        [autoCapitalize]="keyboard() === 'email-address' ? 'none' : 'sentences'"
      />
    </view>
  `,
})
export class FormFieldComponent {
  readonly required = input(false);
  readonly autoComplete = input("off");
  readonly label = input.required<string>();
  readonly value = input("");
  readonly placeholder = input("");
  readonly keyboard = input<KeyboardType>("default");
  readonly multiline = input(false);
  readonly disabled = input(false);
  readonly valueChange = output<string>();
  protected commit(event: unknown): void {
    const value = readNativeText(event);
    if (value !== null) this.valueChange.emit(value);
  }
}
