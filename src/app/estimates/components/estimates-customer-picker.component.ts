import { Component, input, output } from "@angular/core";
import { Pressable, Text, View } from "@ng-native/components";
import { FormFieldComponent } from "../../shared/components/form-field/form-field.component";
import type { Customer } from "../../customers/models/customer.model";
@Component({
  selector: "nora-estimates-customer-picker",
  imports: [Pressable, Text, View, FormFieldComponent],
  template: `<view class="gap-4">
    <text class="section-title">Elegí un cliente</text>
    <nora-field
      label="Buscar cliente para presupuesto"
      placeholder="Ej.: Ana García"
      [value]="search()"
      (valueChange)="searchChange.emit($event)"
    />
    @for (customer of customers(); track customer.id) {
      <pressable
        accessibilityRole="button"
        [accessibilityLabel]="'Seleccionar cliente ' + customer.name"
        class="task-card rounded-2xl p-4"
        (press)="selected.emit(customer)"
        ><text class="task-title">{{ customer.name }}</text></pressable
      >
    } @empty {
      <text class="muted">No hay clientes activos para esa búsqueda.</text>
    }
  </view>`,
})
export class EstimatesCustomerPickerComponent {
  readonly customers = input.required<readonly Customer[]>();
  readonly search = input("");
  readonly searchChange = output<string>();
  readonly selected = output<Customer>();
}
