import { CalendarDatePipe } from "../../shared/pipes/calendar-date.pipe";
import { Component, computed, input, output } from "@angular/core";
import { Text, View } from "@ng-native/components";
import { ActionButtonComponent } from "../../shared/components/action-button/action-button.component";
import { MoneyPipe } from "../../shared/pipes/money.pipe";
import type { Estimate, EstimateStatus } from "../models/estimate.model";
import type { EstimateItemRow } from "../models/estimate-view.model";
import { CustomerAddressCardComponent } from "../../customers/components/customer-address-card.component";
import { EstimateItemCardComponent } from "./estimate-item-card.component";
@Component({
  selector: "nora-estimates-detail",
  imports: [
    CalendarDatePipe,
    Text,
    View,
    ActionButtonComponent,
    MoneyPipe,
    CustomerAddressCardComponent,
    EstimateItemCardComponent,
  ],
  template: `<view class="gap-4">
    <view class="gap-2">
      <text class="task-title">{{ estimate().number }}</text
      ><text class="example-badge"
        >{{ statusLabels()[estimate().status] }} ·
        {{ estimate().currency }}</text
      >
      <text class="task-title">{{ estimate().customerSnapshot.name }}</text>
      @if (estimate().customerSnapshot.phone; as phone) {
        <text class="footnote">+549{{ phone.areaCode }}{{ phone.number }}</text>
      }
      @if (estimate().customerSnapshot.email) {
        <text class="footnote">{{ estimate().customerSnapshot.email }}</text>
      }
      <text class="body-text">{{ estimate().description }}</text>
    </view>
    @if (estimate().customerSnapshot.address; as address) {
      <nora-address-card [address]="address" />
    }
    @for (group of groups(); track group.type) {
      @if (group.rows.length) {
        <view class="gap-2">
          <view class="flex-row justify-between items-center gap-3">
            <text class="section-title">{{
              group.type === "material" ? "Materiales" : "Mano de obra"
            }}</text>
            <text class="footnote"
              >Subtotal {{ group.subtotal | money: estimate().currency }}</text
            > </view
          ><view>
            @for (row of group.rows; track row.item.id) {
              <nora-estimate-item-card
                [row]="row"
                [currency]="estimate().currency"
              />
            }</view
        ></view>
      }
    }
    @if (!items().length) {
      <text class="muted">Borrador sin materiales ni tareas.</text>
    }
    <view class="total-row flex-row justify-between items-center gap-3"
      ><text class="task-title">Total · {{ estimate().currency }}</text
      ><text class="total-amount">{{
        total() | money: estimate().currency
      }}</text></view
    >
    <text class="footnote"
      >Válido hasta:
      {{ (estimate().validUntil | calendarDate) || "Sin vencimiento" }}</text
    >
    @if (estimate().notes) {
      <view class="gap-1"
        ><text class="task-title">Notas y condiciones</text
        ><text class="body-text">{{ estimate().notes }}</text></view
      >
    }
    @if (estimate().status === "draft") {
      <nora-button
        variant="secondary"
        text="Editar presupuesto"
        [disabled]="busy()"
        (pressed)="edit.emit()"
      />
      <nora-button
        variant="danger-link"
        text="Eliminar borrador"
        [disabled]="busy()"
        (pressed)="deleted.emit()"
      />
    }
    @for (status of nextStatuses(); track status) {
      <nora-button
        [text]="'Marcar como ' + statusLabels()[status]"
        [disabled]="busy()"
        (pressed)="statusChanged.emit(status)"
      />
    }
    <text class="footnote"
      >Compartir abre el menú de Android y no cambia el estado. Marcá como
      enviado cuando hayas entregado el presupuesto.</text
    >
  </view>`,
})
export class EstimatesDetailComponent {
  protected readonly groups = computed(() =>
    ["material", "labor"].map((type) => {
      const rows = this.items().filter((row) => row.item.type === type);
      return {
        type,
        rows,
        subtotal: rows.reduce((sum, row) => sum + row.subtotalCents, 0),
      };
    }),
  );
  readonly estimate = input.required<Estimate>();
  readonly items = input.required<readonly EstimateItemRow[]>();
  readonly total = input.required<number>();
  readonly statusLabels = input.required<Record<EstimateStatus, string>>();
  readonly nextStatuses = input.required<readonly EstimateStatus[]>();
  readonly busy = input(false);
  readonly edit = output<void>();
  readonly deleted = output<void>();
  readonly statusChanged = output<EstimateStatus>();
}
