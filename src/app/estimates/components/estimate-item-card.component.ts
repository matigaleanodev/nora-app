import { Component, input } from "@angular/core";
import { Text, View } from "@ng-native/components";
import { MoneyPipe } from "../../shared/pipes/money.pipe";
import type { EstimateItemRow } from "../models/estimate-view.model";
import type { Currency } from "../models/estimate.model";
@Component({
  selector: "nora-estimate-item-card",
  imports: [Text, View, MoneyPipe],
  template: `<view class="task-card rounded-2xl p-4 gap-2">
    <text class="task-category">{{
      row().item.type === "material" ? "Material" : "Mano de obra"
    }}</text>
    <text class="task-title">{{ row().item.description }}</text
    ><text class="muted"
      >{{ row().item.quantity }} {{ row().unitLabel }} ×
      {{ row().item.unitPriceCents | money: currency() }}</text
    >
    <text class="task-title">{{
      row().subtotalCents | money: currency()
    }}</text>
  </view>`,
})
export class EstimateItemCardComponent {
  readonly row = input.required<EstimateItemRow>();
  readonly currency = input.required<Currency>();
}
