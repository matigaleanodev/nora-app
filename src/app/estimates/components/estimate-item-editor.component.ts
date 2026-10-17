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
  template: `<view class="task-card rounded-lg p-4 gap-4">
    <nora-field
      placeholder="Ej.: Pintura látex blanca"
      [required]="true"
      [label]="
        item().type === 'material' ? 'Material *' : 'Trabajo a realizar *'
      "
      [value]="item().description"
      [disabled]="busy()"
      (valueChange)="changed.emit({ description: $event })"
    />
    <nora-field
      placeholder="Ej.: 2,5"
      [required]="true"
      label="Cantidad *"
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
      label="Precio por unidad *"
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
    <text class="muted">El renglón se incorpora al confirmar.</text>
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
