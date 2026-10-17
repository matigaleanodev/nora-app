import { Component, input, output } from "@angular/core";
import { Text, View } from "@ng-native/components";
import { DateFieldComponent } from "../../shared/components/date-field/date-field.component";
import { FormFieldComponent } from "../../shared/components/form-field/form-field.component";
import type { EstimateForm } from "../models/estimate-form.model";

@Component({
  selector: "nora-estimate-conditions",
  imports: [Text, View, DateFieldComponent, FormFieldComponent],
  template: `<view class="gap-4">
    <text class="muted"
      >Estos datos son opcionales y aparecen en el presupuesto.</text
    >
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
  </view>`,
})
export class EstimateConditionsComponent {
  readonly form = input.required<EstimateForm>();
  readonly busy = input(false);
  readonly changed = output<Partial<EstimateForm>>();
}
