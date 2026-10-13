import { Component, input, output } from "@angular/core";
import { Text, View } from "@ng-native/components";
import { FormFieldComponent } from "../form-field/form-field.component";
import { IconToggleComponent } from "../icon-toggle/icon-toggle.component";
import type { ContactForm } from "../../models/contact-form.model";
@Component({
  selector: "nora-contact-fields",
  imports: [Text, View, FormFieldComponent, IconToggleComponent],
  template: `<view class="gap-4">
    <text class="section-title">Contacto</text
    ><text class="footnote"
      >Argentina · +549 · código sin 0 y número sin 15</text
    >
    <view class="flex-row items-end gap-2">
      <view class="area-field"
        ><nora-field
          autoComplete="tel-area-code"
          label="Código de área"
          [required]="!!value().phoneNumber"
          placeholder="Ej.: 376"
          keyboard="phone-pad"
          [value]="value().areaCode"
          (valueChange)="changed.emit({ areaCode: $event })"
          [disabled]="disabled()"
      /></view>
      <view class="flex-1"
        ><nora-field
          autoComplete="tel-local"
          label="Número"
          [required]="!!value().areaCode"
          placeholder="Ej.: 4123456"
          keyboard="phone-pad"
          [value]="value().phoneNumber"
          (valueChange)="changed.emit({ phoneNumber: $event })"
          [disabled]="disabled()"
      /></view>
      <nora-icon-toggle
        label="Tiene WhatsApp"
        [checked]="value().whatsapp"
        [disabled]="disabled()"
        (checkedChange)="changed.emit({ whatsapp: $event })"
      />
    </view>
    <nora-field
      autoComplete="email"
      label="Email"
      placeholder="Ej.: ana@gmail.com"
      keyboard="email-address"
      [value]="value().email"
      (valueChange)="changed.emit({ email: $event })"
      [disabled]="disabled()"
    />
  </view>`,
})
export class ContactFieldsComponent {
  readonly value = input.required<ContactForm>();
  readonly disabled = input(false);
  readonly changed = output<Partial<ContactForm>>();
}
