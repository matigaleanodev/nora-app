import { Component, input, output } from "@angular/core";
import { Text, View } from "@ng-native/components";
import { ActionButtonComponent } from "../../shared/components/action-button/action-button.component";
import type { CustomerAddress } from "../models/customer.model";
import { canOpenMap } from "../utils/contact-links";
@Component({
  selector: "nora-address-card",
  imports: [Text, View, ActionButtonComponent],
  template: `
    <view class="task-card rounded-lg p-4 gap-2">
      <text class="task-title">{{ address().name }}</text>
      <text class="body-text"
        >{{ address().street }} {{ address().streetNumber }}</text
      >
      <text class="body-text"
        >{{ address().city }} · {{ address().province }}</text
      >
      @if (address().floor) {
        <text class="body-text">Piso: {{ address().floor }}</text>
      }
      @if (address().apartment) {
        <text class="body-text">Departamento: {{ address().apartment }}</text>
      }
      @if (mappable()) {
        <nora-button
          variant="secondary"
          text="Ver en Maps"
          [label]="'Ver ' + address().name + ' en Maps'"
          (pressed)="map.emit(address())"
        />
      }
    </view>
  `,
})
export class CustomerAddressCardComponent {
  readonly address = input.required<CustomerAddress>();
  readonly map = output<CustomerAddress>();
  protected mappable(): boolean {
    return canOpenMap(this.address());
  }
}
