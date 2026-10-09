import { Component, input, output } from "@angular/core";
import { Text, View } from "@ng-native/components";
import { ActionButtonComponent } from "../../shared/components/action-button/action-button.component";
import type { Customer } from "../models/customer.model";
import { CustomerAddressCardComponent } from "./customer-address-card.component";
@Component({
  selector: "nora-customers-detail",
  imports: [Text, View, ActionButtonComponent, CustomerAddressCardComponent],
  template: `<view class="gap-4">
    <view class="task-card rounded-2xl p-5 gap-4">
      <text class="section-title">{{ customer().name }}</text
      ><text class="example-badge">{{
        customer().archived ? "ARCHIVADO" : "ACTIVO"
      }}</text>
      @if (customer().phone; as phone) {
        <text class="body-text"
          >Teléfono: +549{{ phone.areaCode }}{{ phone.number }}</text
        ><text class="body-text"
          >WhatsApp: {{ phone.whatsapp ? "Sí" : "No" }}</text
        >
      } @else {
        <text class="body-text">Teléfono: Sin teléfono</text>
      }
      <text class="body-text">Email: {{ customer().email || "Sin email" }}</text
      ><text class="body-text"
        >Notas: {{ customer().notes || "Sin notas" }}</text
      >
    </view>
    <text class="section-title">Direcciones</text>
    @for (address of customer().addresses; track address.id) {
      <nora-address-card [address]="address" />
    } @empty {
      <text class="muted">Sin direcciones guardadas.</text>
    }
    <nora-button
      variant="primary"
      text="Editar cliente"
      [disabled]="busy()"
      (pressed)="edit.emit()"
    />
    <nora-button
      [variant]="customer().archived ? 'secondary' : 'danger'"
      [text]="customer().archived ? 'Restaurar cliente' : 'Archivar cliente'"
      [disabled]="busy()"
      (pressed)="archive.emit()"
    />
  </view>`,
})
export class CustomersDetailComponent {
  readonly customer = input.required<Customer>();
  readonly busy = input(false);
  readonly edit = output<void>();
  readonly archive = output<void>();
}
