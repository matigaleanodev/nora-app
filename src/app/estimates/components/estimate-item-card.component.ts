import { Component, input } from "@angular/core";
import { Text, View } from "@ng-native/components";
import { MoneyPipe } from "../../shared/pipes/money.pipe";
import type { EstimateItemRow } from "../models/estimate-view.model";
import type { Currency } from "../models/estimate.model";
@Component({
  selector: "nora-estimate-item-card",
  imports: [Text, View, MoneyPipe],
  template: `<view class="compact-row gap-1">
    <view class="flex-row items-start gap-3">
      <text class="body-text flex-1">{{ row().item.description }}</text>
      <text class="task-title">{{
        row().subtotalCents | money: currency()
      }}</text> </view
    ><text class="footnote"
      >{{ row().item.quantity }} {{ row().unitLabel }} ×
      {{ row().item.unitPriceCents | money: currency() }}</text
    >
  </view>`,
})
export class EstimateItemCardComponent {
  readonly row = input.required<EstimateItemRow>();
  readonly currency = input.required<Currency>();
}
