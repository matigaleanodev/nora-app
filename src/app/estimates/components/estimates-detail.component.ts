import { CalendarDatePipe } from "../../shared/pipes/calendar-date.pipe";
import { Component, input, output } from "@angular/core";
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
    <view class="task-card rounded-2xl p-5 gap-3">
      <text class="section-title">{{ estimate().number }}</text
      ><text class="example-badge"
        >{{ statusLabels()[estimate().status] }} ·
        {{ estimate().currency }}</text
      >
      <text class="task-title">{{ estimate().customerSnapshot.name }}</text>
      @if (estimate().customerSnapshot.phone; as phone) {
        <text class="body-text"
          >+549{{ phone.areaCode }}{{ phone.number }} · WhatsApp:
          {{ phone.whatsapp ? "Sí" : "No" }}</text
        >
      }
      @if (estimate().customerSnapshot.email) {
        <text class="body-text">{{ estimate().customerSnapshot.email }}</text>
      }
      <text class="body-text">{{ estimate().description }}</text
      ><text class="muted"
        >Válido hasta:
        {{ (estimate().validUntil | calendarDate) || "Sin vencimiento" }}</text
      >
      @if (estimate().notes) {
        <text class="body-text">{{ estimate().notes }}</text>
      }
    </view>
    @if (estimate().customerSnapshot.address; as address) {
      <nora-address-card [address]="address" />
    }
    <text class="section-title">Detalle del trabajo</text>
    @for (row of items(); track row.item.id) {
      <nora-estimate-item-card [row]="row" [currency]="estimate().currency" />
    } @empty {
      <text class="muted">Borrador sin ítems.</text>
    }
    <view class="summary-card rounded-2xl p-5 gap-2"
      ><text class="summary-label">TOTAL · {{ estimate().currency }}</text
      ><text class="summary-amount">{{
        total() | money: estimate().currency
      }}</text></view
    >
    @if (estimate().status === "draft") {
      <nora-button
        variant="primary"
        text="Editar presupuesto"
        [disabled]="busy()"
        (pressed)="edit.emit()"
      />
      <nora-button
        variant="danger"
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
      >Los estados sólo registran el seguimiento. Por ahora no generan PDF ni
      envían mensajes.</text
    >
  </view>`,
})
export class EstimatesDetailComponent {
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
