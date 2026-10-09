import { Component, inject, input, output } from "@angular/core";
import { Pressable, Text, View } from "@ng-native/components";
import { ActionButtonComponent } from "../../shared/components/action-button/action-button.component";
import { FormFieldComponent } from "../../shared/components/form-field/form-field.component";
import { IconToggleComponent } from "../../shared/components/icon-toggle/icon-toggle.component";
import { ModalComponent } from "../../shared/components/modal/modal.component";
import { AddressEditorService } from "../services/address-editor.service";
import type { CustomerInput } from "../models/customer.model";
import type { CustomerForm } from "../models/customer-form.model";
import {
  CustomerAddressEditorComponent,
  type AddressChanges,
} from "./customer-address-editor.component";
@Component({
  selector: "nora-customers-form",
  providers: [AddressEditorService],
  imports: [
    ModalComponent,
    IconToggleComponent,
    Pressable,
    Text,
    View,
    ActionButtonComponent,
    FormFieldComponent,
    CustomerAddressEditorComponent,
  ],
  template: `<view class="gap-4">
      <nora-field
        autoComplete="name"
        label="Nombre *"
        placeholder="Ej.: Ana García"
        [value]="form().name"
        (valueChange)="changed.emit({ name: $event })"
        [disabled]="busy()"
      />
      <text class="section-title">Contacto</text
      ><text class="footnote"
        >Argentina · +549 · código sin 0 y número sin 15</text
      >
      <view class="flex-row items-end gap-2">
        <view class="area-field"
          ><nora-field
            autoComplete="tel-area-code"
            label="Código de área"
            [required]="!!form().phoneNumber"
            placeholder="Ej.: 376"
            keyboard="phone-pad"
            [value]="form().areaCode"
            (valueChange)="changed.emit({ areaCode: $event })"
            [disabled]="busy()"
        /></view>
        <view class="flex-1"
          ><nora-field
            autoComplete="tel-local"
            label="Número"
            [required]="!!form().areaCode"
            placeholder="Ej.: 4123456"
            keyboard="phone-pad"
            [value]="form().phoneNumber"
            (valueChange)="changed.emit({ phoneNumber: $event })"
            [disabled]="busy()"
        /></view>
        <nora-icon-toggle
          label="Tiene WhatsApp"
          [checked]="form().whatsapp"
          [disabled]="busy()"
          (checkedChange)="changed.emit({ whatsapp: $event })"
        />
      </view>
      <nora-field
        autoComplete="email"
        label="Email"
        placeholder="Ej.: ana@gmail.com"
        keyboard="email-address"
        [value]="form().email"
        (valueChange)="changed.emit({ email: $event })"
        [disabled]="busy()"
      />
      <text class="section-title">Direcciones</text
      ><text class="footnote"
        >Podés agregar casa, local u otros lugares de trabajo.</text
      >
      @for (address of form().addresses; track $index; let index = $index) {
        <pressable
          class="task-card rounded-2xl p-4 gap-1"
          accessibilityRole="button"
          [accessibilityLabel]="'Editar dirección ' + (index + 1)"
          [disabled]="busy()"
          (press)="editor.open(address, index)"
        >
          <text class="section-title">{{ address.name }}</text>
          <text class="muted"
            >{{ address.street }} {{ address.streetNumber }} ·
            {{ address.city }}</text
          >
        </pressable>
      }
      <nora-button
        text="+ Agregar dirección"
        label="Agregar dirección"
        [disabled]="busy()"
        (pressed)="editor.open()"
      />
      <nora-field
        label="Notas del cliente"
        placeholder="Ej.: Llamar por la tarde"
        [multiline]="true"
        [value]="form().notes"
        (valueChange)="changed.emit({ notes: $event })"
        [disabled]="busy()"
      />
    </view>
    @if (editor.draft(); as draft) {
      <nora-modal
        [visible]="true"
        [title]="draft.index === null ? 'Nueva dirección' : 'Editar dirección'"
        confirmLabel="Guardar dirección"
        [error]="editor.error()"
        (cancel)="editor.cancel()"
        (confirm)="saveAddress()"
      >
        <nora-address-editor
          [address]="draft.address"
          [index]="draft.index ?? form().addresses.length"
          (changed)="editor.update($event)"
          (removed)="removeAddress()"
        />
      </nora-modal>
    }`,
})
export class CustomersFormComponent {
  protected readonly editor = inject(AddressEditorService);
  readonly form = input.required<CustomerForm>();
  readonly busy = input(false);
  readonly changed = output<Partial<CustomerForm>>();
  readonly addressChanged = output<{
    index: number;
    changes: AddressChanges;
  }>();
  readonly addressAdded = output<CustomerInput["addresses"][number]>();
  readonly addressRemoved = output<number>();
  protected saveAddress(): void {
    const draft = this.editor.confirm();
    if (!draft) return;
    if (draft.index === null) this.addressAdded.emit(draft.address);
    else
      this.addressChanged.emit({ index: draft.index, changes: draft.address });
  }
  protected removeAddress(): void {
    const draft = this.editor.draft();
    if (draft?.index !== null && draft?.index !== undefined)
      this.addressRemoved.emit(draft.index);
    this.editor.cancel();
  }
}
