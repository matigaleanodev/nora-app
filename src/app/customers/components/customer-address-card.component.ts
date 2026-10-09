import { Component, input } from "@angular/core";
import { Text, View } from "@ng-native/components";
import type { CustomerAddress } from "../models/customer.model";
@Component({
  selector: "nora-address-card",
  imports: [Text, View],
  template: `
    <view class="task-card rounded-2xl p-4 gap-2">
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
    </view>
  `,
})
export class CustomerAddressCardComponent {
  readonly address = input.required<CustomerAddress>();
}
