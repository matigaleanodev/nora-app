import { Component, input, output } from "@angular/core";
import { Text, View } from "@ng-native/components";
import { ActionButtonComponent } from "../../shared/components/action-button/action-button.component";
import { FormFieldComponent } from "../../shared/components/form-field/form-field.component";
import { MoneyPipe } from "../../shared/pipes/money.pipe";
import type { EstimateItemForm } from "../models/estimate-form.model";
import type {
  Currency,
  EstimateItemType,
  MeasurementUnit,
} from "../models/estimate.model";
@Component({
  selector: "nora-estimate-item-editor",
  imports: [Text, View, ActionButtonComponent, FormFieldComponent, MoneyPipe],
  template: `<view class="task-card rounded-2xl p-4 gap-4">
    <text class="section-title">Ítem {{ index() + 1 }}</text>
    <nora-field
      placeholder="Ej.: Pintura látex blanca"
      [required]="true"
      [label]="'Descripción del ítem ' + (index() + 1)"
      [value]="item().description"
      [disabled]="busy()"
      (valueChange)="changed.emit({ description: $event })"
    />
    <view class="flex-row gap-2">
      @for (type of itemTypes(); track type.value) {
        <nora-button
          variant="choice"
          [text]="type.label"
          [label]="type.label + ' del ítem ' + (index() + 1)"
          [selected]="item().type === type.value"
          [disabled]="busy()"
          (pressed)="changed.emit({ type: type.value })"
        />
      }
    </view>
    <nora-field
      placeholder="Ej.: 2,5"
      [required]="true"
      [label]="'Cantidad del ítem ' + (index() + 1)"
      keyboard="decimal-pad"
      [value]="item().quantity"
      [disabled]="busy()"
      (valueChange)="changed.emit({ quantity: $event })"
    />
    <text class="field-label">Unidad *</text>
    <view class="flex-row flex-wrap gap-2">
      @for (unit of units(); track unit.value) {
        <nora-button
          variant="choice"
          [text]="unit.label"
          [label]="unit.label + ' del ítem ' + (index() + 1)"
          [selected]="item().unit === unit.value"
          [disabled]="busy()"
          (pressed)="changed.emit({ unit: unit.value })"
        />
      }
    </view>
    <nora-field
      [required]="true"
      [label]="'Precio unitario del ítem ' + (index() + 1)"
      keyboard="decimal-pad"
      placeholder="Ej.: 1500,50"
      [value]="item().price"
      [disabled]="busy()"
      (valueChange)="changed.emit({ price: $event })"
    />
    @if (subtotal() !== undefined) {
      <text class="task-title"
        >Parcial: {{ subtotal()! | money: currency() }}</text
      >
    }
    <nora-button
      variant="danger"
      text="Quitar ítem"
      [label]="'Quitar ítem ' + (index() + 1)"
      [disabled]="busy()"
      (pressed)="removed.emit()"
    />
  </view>`,
})
export class EstimateItemEditorComponent {
  readonly item = input.required<EstimateItemForm>();
  readonly index = input.required<number>();
  readonly currency = input.required<Currency>();
  readonly subtotal = input<number>();
  readonly busy = input(false);
  readonly units =
    input.required<readonly { value: MeasurementUnit; label: string }[]>();
  readonly itemTypes =
    input.required<readonly { value: EstimateItemType; label: string }[]>();
  readonly changed = output<Partial<Omit<EstimateItemForm, "id">>>();
  readonly removed = output<void>();
}
