import { Component, input, output, computed, signal } from "@angular/core";
import { Text, View, Pressable } from "@ng-native/components";
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
@Component({
  selector: "nora-estimates-form",
  imports: [
    Pressable,
    Text,
    View,
    ActionButtonComponent,
    FormFieldComponent,
    MoneyPipe,
    DateFieldComponent,
    EstimateCustomerSelectionComponent,
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
    @for (group of groups(); track group.type) {
      <text class="section-title">{{ group.label }}</text>
      @if (group.subtotal !== null) {
        <text class="muted"
          >Subtotal {{ group.subtotal! | money: form().currency }}</text
        >
      }
      @for (row of group.rows; track row.index) {
        <pressable
          class="compact-row gap-2"
          accessibilityRole="button"
          [accessibilityLabel]="'Editar ' + row.item.description"
          (press)="itemEdited.emit(row.index)"
        >
          <text class="body-text">{{ row.item.description }}</text>
          <text class="muted"
            >{{ row.item.quantity }} {{ row.item.unit }} × {{ row.item.price }}
            {{ form().currency }}</text
          >
          @if (row.subtotal !== undefined) {
            <text class="task-title">{{
              row.subtotal! | money: form().currency
            }}</text>
          } @else {
            <text class="error-text"
              >Falta completar este material o tarea</text
            >
          }
        </pressable>
      }
      <nora-button
        [text]="
          group.type === 'material'
            ? 'Agregar material'
            : 'Agregar mano de obra'
        "
        [disabled]="busy()"
        (pressed)="typeAdded.emit(group.type)"
      />
    }
    @if (preview().total !== null) {
      <text class="section-title"
        >Total: {{ preview().total! | money: form().currency }}</text
      >
    } @else {
      <text class="footnote">{{ preview().error }}</text>
    }
    <nora-button
      text="Vigencia y condiciones"
      [selected]="optionsOpen()"
      (pressed)="optionsOpen.set(!optionsOpen())"
    />
    @if (!optionsOpen() && (form().validUntil || form().notes)) {
      <text class="muted">Contiene datos cargados</text>
    }
    @if (optionsOpen()) {
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
    }
  </view>`,
})
export class EstimatesFormComponent {
  readonly optionsOpen = signal(false);
  readonly itemEdited = output<number>();
  readonly typeAdded = output<EstimateItemType>();
  protected readonly groups = computed(() =>
    this.itemTypes().map((group) => {
      const rows = this.form()
        .items.map((item, index) => ({
          item,
          index,
          subtotal: this.preview().subtotals[index],
        }))
        .filter((row) => row.item.type === group.value);
      return {
        type: group.value,
        label: group.value === "material" ? "Materiales" : "Mano de obra",
        rows,
        subtotal: rows.every((row) => row.subtotal !== undefined)
          ? rows.reduce((sum, row) => sum + row.subtotal!, 0)
          : null,
      };
    }),
  );
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
}
