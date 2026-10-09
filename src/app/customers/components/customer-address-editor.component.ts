import { Component, input, output } from "@angular/core";
import { Text, View } from "@ng-native/components";
import { ActionButtonComponent } from "../../shared/components/action-button/action-button.component";
import { FormFieldComponent } from "../../shared/components/form-field/form-field.component";
import type { CustomerInput, CustomerAddress } from "../models/customer.model";
export type AddressChanges = Partial<Omit<CustomerAddress, "id">>;
@Component({
  selector: "nora-address-editor",
  imports: [Text, View, ActionButtonComponent, FormFieldComponent],
  template: `<view class="task-card rounded-2xl p-4 gap-4">
    <text class="section-title">Dirección {{ index() + 1 }}</text>
    <nora-field
      label="Nombre de dirección *"
      placeholder="Ej.: Casa o local"
      [value]="address().name"
      [disabled]="disabled()"
      (valueChange)="changed.emit({ name: $event })"
    />
    <nora-field
      autoComplete="street-address"
      label="Calle"
      placeholder="Ej.: San Martín"
      [value]="address().street"
      [disabled]="disabled()"
      (valueChange)="changed.emit({ street: $event })"
    />
    <nora-field
      label="Altura"
      placeholder="Ej.: 123"
      [value]="address().streetNumber"
      [disabled]="disabled()"
      (valueChange)="changed.emit({ streetNumber: $event })"
    />
    <nora-field
      autoComplete="address-level2"
      label="Ciudad"
      placeholder="Ej.: Posadas"
      [value]="address().city"
      [disabled]="disabled()"
      (valueChange)="changed.emit({ city: $event })"
    />
    <nora-field
      autoComplete="address-level1"
      label="Provincia"
      placeholder="Ej.: Misiones"
      [value]="address().province"
      [disabled]="disabled()"
      (valueChange)="changed.emit({ province: $event })"
    />
    <nora-field
      label="Piso"
      placeholder="Ej.: 2"
      [value]="address().floor ?? ''"
      [disabled]="disabled()"
      (valueChange)="changed.emit({ floor: $event })"
    />
    <nora-field
      label="Departamento"
      placeholder="Ej.: B"
      [value]="address().apartment ?? ''"
      [disabled]="disabled()"
      (valueChange)="changed.emit({ apartment: $event })"
    />
    <nora-button
      variant="danger"
      text="Quitar dirección"
      [label]="'Quitar dirección ' + (index() + 1)"
      [disabled]="disabled()"
      (pressed)="removed.emit()"
    />
  </view>`,
})
export class CustomerAddressEditorComponent {
  readonly address = input.required<CustomerInput["addresses"][number]>();
  readonly index = input.required<number>();
  readonly disabled = input(false);
  readonly changed = output<AddressChanges>();
  readonly removed = output<void>();
}
