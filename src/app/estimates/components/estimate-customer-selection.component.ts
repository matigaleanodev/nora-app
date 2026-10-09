import { Component, input, output } from "@angular/core";
import { Text, View } from "@ng-native/components";
import { ActionButtonComponent } from "../../shared/components/action-button/action-button.component";
import type { Customer } from "../../customers/models/customer.model";
@Component({
  selector: "nora-estimate-customer-selection",
  imports: [Text, View, ActionButtonComponent],
  template: `<view class="gap-4">
    <text class="field-label">Cliente *</text>
    <nora-button
      [text]="(customer()?.name || 'Seleccionar cliente') + ' ›'"
      label="Elegir cliente"
      [disabled]="busy()"
      (pressed)="choose.emit()"
    />
    @if (customer(); as selected) {
      <text class="field-label">Dirección del trabajo</text>
      <nora-button
        variant="choice"
        text="Sin dirección"
        label="Sin dirección de trabajo"
        [selected]="!addressId()"
        [disabled]="busy()"
        (pressed)="addressChanged.emit('')"
      />
      @for (address of selected.addresses; track address.id) {
        <nora-button
          variant="choice"
          [text]="
            address.name + ' · ' + address.street + ' ' + address.streetNumber
          "
          [label]="'Usar dirección ' + address.name"
          [selected]="addressId() === address.id"
          [disabled]="busy()"
          (pressed)="addressChanged.emit(address.id)"
        />
      }
    }
  </view>`,
})
export class EstimateCustomerSelectionComponent {
  readonly customer = input<Customer>();
  readonly addressId = input("");
  readonly busy = input(false);
  readonly choose = output<void>();
  readonly addressChanged = output<string>();
}
