import { Component, input, output } from "@angular/core";
import { Text, View } from "@ng-native/components";
import { ActionButtonComponent } from "../../shared/components/action-button/action-button.component";
import { FormFieldComponent } from "../../shared/components/form-field/form-field.component";
import { DateFieldComponent } from "../../shared/components/date-field/date-field.component";
import { MoneyPipe } from "../../shared/pipes/money.pipe";
import type { Customer } from "../../customers/models/customer.model";
import type {
  EstimateForm,
  EstimateItemForm,
} from "../models/estimate-form.model";
import type { EstimatePreview } from "../models/estimate-view.model";
import type {
  Currency,
  EstimateItemType,
  MeasurementUnit,
} from "../models/estimate.model";
import { EstimateCustomerSelectionComponent } from "./estimate-customer-selection.component";
import { EstimateItemEditorComponent } from "./estimate-item-editor.component";
@Component({
  selector: "nora-estimates-form",
  imports: [
    Text,
    View,
    ActionButtonComponent,
    FormFieldComponent,
    MoneyPipe,
    DateFieldComponent,
    EstimateCustomerSelectionComponent,
    EstimateItemEditorComponent,
  ],
  template: `<view class="gap-4">
    <nora-field
      label="Número de presupuesto *"
      placeholder="Ej.: P-001"
      [value]="form().number"
      [disabled]="busy()"
      (valueChange)="changed.emit({ number: $event })"
    />
    <nora-estimate-customer-selection
      [customer]="customer()"
      [addressId]="form().addressId"
      [busy]="busy()"
      (choose)="chooseCustomer.emit()"
      (addressChanged)="changed.emit({ addressId: $event })"
    />
    <nora-field
      label="Descripción del trabajo *"
      placeholder="Ej.: Pintura de paredes del living"
      [multiline]="true"
      [value]="form().description"
      [disabled]="busy()"
      (valueChange)="changed.emit({ description: $event })"
    />
    <text class="field-label">Moneda *</text
    ><view class="flex-row gap-2">
      @for (currency of currencies(); track currency) {
        <nora-button
          variant="choice"
          [text]="currency"
          [label]="'Moneda ' + currency"
          [selected]="form().currency === currency"
          [disabled]="busy()"
          (pressed)="changed.emit({ currency })"
        />
      }</view
    ><text class="footnote"
      >Todos los precios usan la moneda elegida. Cambiarla no convierte
      importes.</text
    >
    <text class="section-title">Materiales y mano de obra</text>
    @for (item of form().items; track $index; let index = $index) {
      <nora-estimate-item-editor
        [item]="item"
        [index]="index"
        [currency]="form().currency"
        [subtotal]="preview().subtotals[index]"
        [units]="units()"
        [itemTypes]="itemTypes()"
        [busy]="busy()"
        (changed)="itemChanged.emit({ index, changes: $event })"
        (removed)="itemRemoved.emit(index)"
      />
    }
    <nora-button
      text="+ Agregar ítem"
      label="Agregar ítem"
      [disabled]="busy()"
      (pressed)="itemAdded.emit()"
    />
    @if (preview().total !== null) {
      <text class="section-title"
        >Total: {{ preview().total! | money: form().currency }}</text
      >
    } @else {
      <text class="footnote">{{ preview().error }}</text>
    }
    <nora-date-field
      label="Válido hasta"
      [value]="form().validUntil"
      [disabled]="busy()"
      (valueChange)="changed.emit({ validUntil: $event })"
    />
    <nora-field
      label="Notas y condiciones"
      placeholder="Ej.: Incluye materiales. Pago al finalizar."
      [multiline]="true"
      [value]="form().notes"
      [disabled]="busy()"
      (valueChange)="changed.emit({ notes: $event })"
    />
    <text class="footnote"
      >Podés guardar un borrador sin ítems y completarlo después.</text
    >
  </view>`,
})
export class EstimatesFormComponent {
  readonly form = input.required<EstimateForm>();
  readonly customer = input<Customer>();
  readonly busy = input(false);
  readonly preview = input.required<EstimatePreview>();
  readonly currencies = input.required<readonly Currency[]>();
  readonly units =
    input.required<readonly { value: MeasurementUnit; label: string }[]>();
  readonly itemTypes =
    input.required<readonly { value: EstimateItemType; label: string }[]>();
  readonly changed = output<Partial<EstimateForm>>();
  readonly chooseCustomer = output<void>();
  readonly itemAdded = output<void>();
  readonly itemRemoved = output<number>();
  readonly itemChanged = output<{
    index: number;
    changes: Partial<Omit<EstimateItemForm, "id">>;
  }>();
}
