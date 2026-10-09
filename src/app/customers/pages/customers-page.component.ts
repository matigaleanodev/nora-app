import { Component, DestroyRef, inject } from "@angular/core";
import { View } from "@ng-native/components";
import { PageLayoutComponent } from "../../shared/components/page-layout/page-layout.component";
import { ActionButtonComponent } from "../../shared/components/action-button/action-button.component";
import { FabComponent } from "../../shared/components/fab/fab.component";
import { CustomersPageService } from "../services/customers-page.service";
import { CustomersListComponent } from "../components/customers-list.component";
import { CustomersDetailComponent } from "../components/customers-detail.component";
import { CustomersFormComponent } from "../components/customers-form.component";
@Component({
  selector: "nora-customers",
  imports: [
    View,
    PageLayoutComponent,
    ActionButtonComponent,
    FabComponent,
    CustomersListComponent,
    CustomersDetailComponent,
    CustomersFormComponent,
  ],
  template: `
    <nora-page-layout
      [title]="vm.title()"
      eyebrow="TU RED DE TRABAJO"
      [error]="vm.error()"
      [busy]="vm.busy()"
      [backLabel]="vm.screen() === 'list' ? '' : 'Volver a clientes'"
      [resetKey]="vm.viewKey()"
      (back)="vm.back()"
    >
      @switch (vm.screen()) {
        @case ("list") {
          <nora-customers-list
            [customers]="vm.list()"
            [loading]="vm.loading()"
            [error]="vm.error()"
            [search]="vm.search()"
            [archived]="vm.showArchived()"
            (opened)="vm.open($event)"
            (searchChange)="vm.search.set($event)"
            (archivedChange)="vm.showArchived.set($event)"
            (retry)="vm.enter()"
          />
        }
        @case ("detail") {
          @if (vm.selected(); as customer) {
            <nora-customers-detail
              [customer]="customer"
              [busy]="vm.busy()"
              (edit)="vm.edit()"
              (archive)="vm.archive()"
            />
          }
        }
        @case ("form") {
          <nora-customers-form
            [form]="vm.form()"
            [busy]="vm.busy()"
            (changed)="vm.updateForm($event)"
            (addressChanged)="vm.updateAddress($event.index, $event.changes)"
            (addressAdded)="vm.addAddress($event)"
            (addressRemoved)="vm.removeAddress($event)"
          />
        }
      }

      <view page-fab class="fab-layer" pointerEvents="box-none">
        @if (vm.screen() === "list") {
          <nora-fab
            label="Agregar cliente"
            [disabled]="vm.loading() || !!vm.error()"
            (pressed)="vm.create()"
          />
        }
      </view>
      <view page-footer>
        @if (vm.screen() === "form") {
          <view class="form-footer px-6 py-3"
            ><nora-button
              variant="primary"
              label="Guardar cliente"
              [text]="vm.busy() ? 'Guardando…' : 'Guardar cliente'"
              [disabled]="vm.busy() || vm.loading()"
              (pressed)="vm.save()"
          /></view>
        }
      </view>
    </nora-page-layout>
  `,
  styles: ":host { flex: 1; }",
})
export class CustomersPageComponent {
  protected readonly vm = inject(CustomersPageService);
  constructor() {
    this.vm.bindBack(inject(DestroyRef));
    void this.vm.enter();
  }
}
