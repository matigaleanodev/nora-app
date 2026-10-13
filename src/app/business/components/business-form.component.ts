import { Component, input, output } from "@angular/core";
import { Image, Text, View } from "@ng-native/components";
import { ContactFieldsComponent } from "../../shared/components/contact-fields/contact-fields.component";
import { FormFieldComponent } from "../../shared/components/form-field/form-field.component";
import { ActionButtonComponent } from "../../shared/components/action-button/action-button.component";
import type { BusinessForm } from "../models/business-profile.model";
@Component({
  selector: "nora-business-form",
  imports: [
    Image,
    Text,
    View,
    ContactFieldsComponent,
    FormFieldComponent,
    ActionButtonComponent,
  ],
  template: `<view class="gap-4">
    <text class="muted"
      >Estos datos identificarán tu negocio en los próximos presupuestos en
      PDF.</text
    >
    <nora-field
      label="Nombre o nombre comercial *"
      placeholder="Ej.: Juan Pérez · Electricidad"
      autoComplete="organization"
      [value]="form().displayName"
      [disabled]="disabled()"
      (valueChange)="changed.emit({ displayName: $event })"
    />
    <nora-contact-fields
      [value]="form()"
      [disabled]="disabled()"
      (changed)="changed.emit($event)"
    />
    <text class="section-title">Logo opcional</text>
    @if (form().logo; as logo) {
      <view class="task-card rounded-2xl p-4 items-center">
        <image
          [source]="{ uri: logo.uri }"
          resizeMode="contain"
          accessibilityLabel="Logo de tu negocio"
          [style]="{ width: 160, height: 120 }"
        />
      </view>
    }
    <nora-button
      [text]="form().logo ? 'Cambiar logo' : 'Elegir logo de la galería'"
      label="Elegir logo"
      [disabled]="disabled()"
      (pressed)="chooseLogo.emit()"
    />
    @if (form().logo) {
      <nora-button
        variant="danger"
        text="Quitar logo"
        [disabled]="disabled()"
        (pressed)="changed.emit({ logo: undefined })"
      />
    }
    <text class="footnote"
      >JPG, PNG o WebP · hasta 5 MB. Se guarda una copia en tu teléfono al
      guardar los datos.</text
    >
  </view>`,
})
export class BusinessFormComponent {
  readonly form = input.required<BusinessForm>();
  readonly disabled = input(false);
  readonly changed = output<Partial<BusinessForm>>();
  readonly chooseLogo = output<void>();
}
