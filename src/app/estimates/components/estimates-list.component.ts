import { Component, input, output } from "@angular/core";
import { Pressable, Text, View } from "@ng-native/components";
import { ActionButtonComponent } from "../../shared/components/action-button/action-button.component";
import { FormFieldComponent } from "../../shared/components/form-field/form-field.component";
import { MoneyPipe } from "../../shared/pipes/money.pipe";
import type { EstimateListRow } from "../models/estimate-view.model";
import type { Estimate, EstimateStatus } from "../models/estimate.model";
@Component({
  selector: "nora-estimates-list",
  imports: [
    Pressable,
    Text,
    View,
    ActionButtonComponent,
    FormFieldComponent,
    MoneyPipe,
  ],
  template: `<view class="gap-4">
    <nora-field
      label="Buscar presupuestos"
      [value]="search()"
      (valueChange)="searchChange.emit($event)"
      placeholder="Ej.: P-001 o Ana"
    />
    @if (loading()) {
      <text class="muted">Cargando presupuestos…</text>
    } @else if (error()) {
      <nora-button
        text="Reintentar"
        label="Reintentar presupuestos"
        (pressed)="retry.emit()"
      />
    } @else {
      @for (row of rows(); track row.estimate.id) {
        <pressable
          accessibilityRole="button"
          [accessibilityLabel]="'Ver presupuesto ' + row.estimate.number"
          class="task-card rounded-2xl p-4 gap-2"
          (press)="opened.emit(row.estimate)"
        >
          <view class="flex-row justify-between gap-3"
            ><text class="task-title flex-1">{{ row.estimate.number }}</text
            ><text class="example-badge">{{
              statusLabels()[row.estimate.status]
            }}</text></view
          >
          <text class="muted">{{ row.estimate.customerSnapshot.name }}</text
          ><text class="section-title">{{
            row.totalCents | money: row.estimate.currency
          }}</text>
        </pressable>
      } @empty {
        <view class="task-card rounded-2xl p-6 gap-2"
          ><text class="section-title">Tus próximos trabajos empiezan acá.</text
          ><text class="muted"
            >Primero agregá un cliente y después usá + para preparar su
            presupuesto.</text
          ></view
        >
      }
    }
  </view>`,
})
export class EstimatesListComponent {
  readonly rows = input.required<readonly EstimateListRow[]>();
  readonly statusLabels = input.required<Record<EstimateStatus, string>>();
  readonly loading = input(false);
  readonly error = input("");
  readonly search = input("");
  readonly opened = output<Estimate>();
  readonly searchChange = output<string>();
  readonly retry = output<void>();
}
