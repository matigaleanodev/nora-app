import { Component, input, output } from "@angular/core";
import { Pressable, Text, View } from "@ng-native/components";
import { ActionButtonComponent } from "../../shared/components/action-button/action-button.component";
import { FormFieldComponent } from "../../shared/components/form-field/form-field.component";
import type { Customer } from "../models/customer.model";
@Component({
  selector: "nora-customers-list",
  imports: [Pressable, Text, View, ActionButtonComponent, FormFieldComponent],
  template: `<view class="gap-4">
    <nora-field
      label="Buscar clientes"
      [value]="search()"
      (valueChange)="searchChange.emit($event)"
      placeholder="Ej.: Ana o 4123456"
    />
    <view class="flex-row gap-2">
      <nora-button
        variant="choice"
        text="Activos"
        label="Ver clientes activos"
        [selected]="!archived()"
        (pressed)="archivedChange.emit(false)"
      />
      <nora-button
        variant="choice"
        text="Archivados"
        label="Ver clientes archivados"
        [selected]="archived()"
        (pressed)="archivedChange.emit(true)"
      />
    </view>
    @if (loading()) {
      <text class="muted">Cargando clientes…</text>
    } @else if (error()) {
      <nora-button
        text="Reintentar"
        label="Reintentar clientes"
        (pressed)="retry.emit()"
      />
    } @else {
      @for (customer of customers(); track customer.id) {
        <pressable
          accessibilityRole="button"
          [accessibilityLabel]="'Ver cliente ' + customer.name"
          class="task-card rounded-2xl p-4 gap-2"
          (press)="opened.emit(customer)"
        >
          <view class="flex-row justify-between items-center gap-3"
            ><text class="task-title flex-1">{{ customer.name }}</text
            ><text class="muted">›</text></view
          >
          @if (customer.phone; as phone) {
            <text class="muted"
              >+549{{ phone.areaCode }}{{ phone.number }}</text
            >
          } @else {
            <text class="muted">Sin teléfono</text>
          }
        </pressable>
      } @empty {
        <view class="task-card rounded-2xl p-6 gap-2"
          ><text class="section-title">Todavía no hay clientes acá.</text
          ><text class="muted"
            >Usá + para agregar uno o probá otra búsqueda.</text
          ></view
        >
      }
    }
  </view>`,
})
export class CustomersListComponent {
  readonly customers = input.required<readonly Customer[]>();
  readonly loading = input(false);
  readonly error = input("");
  readonly search = input("");
  readonly archived = input(false);
  readonly opened = output<Customer>();
  readonly searchChange = output<string>();
  readonly archivedChange = output<boolean>();
  readonly retry = output<void>();
}
