import { Component, DestroyRef, inject } from "@angular/core";
import { View } from "@ng-native/components";
import { PageLayoutComponent } from "../../shared/components/page-layout/page-layout.component";
import { ActionButtonComponent } from "../../shared/components/action-button/action-button.component";
import { FabComponent } from "../../shared/components/fab/fab.component";
import { EstimatesPageService } from "../services/estimates-page.service";
import { EstimatesListComponent } from "../components/estimates-list.component";
import { EstimatesDetailComponent } from "../components/estimates-detail.component";
import { EstimatesFormComponent } from "../components/estimates-form.component";
import { EstimatesCustomerPickerComponent } from "../components/estimates-customer-picker.component";
@Component({
  selector: "nora-estimates",
  imports: [
    View,
    PageLayoutComponent,
    ActionButtonComponent,
    FabComponent,
    EstimatesListComponent,
    EstimatesDetailComponent,
    EstimatesFormComponent,
    EstimatesCustomerPickerComponent,
  ],
  template: `
    <nora-page-layout
      [title]="vm.title()"
      eyebrow="DE LA IDEA AL TRABAJO"
      [error]="vm.error()"
      [busy]="vm.busy()"
      [backLabel]="vm.screen() === 'list' ? '' : 'Volver a presupuestos'"
      [resetKey]="vm.viewKey()"
      (back)="vm.back()"
    >
      @switch (vm.screen()) {
        @case ("list") {
          <nora-estimates-list
            [rows]="vm.listRows()"
            [statusLabels]="vm.statusLabels"
            [loading]="vm.loading()"
            [error]="vm.error()"
            [search]="vm.search()"
            (opened)="vm.open($event)"
            (searchChange)="vm.search.set($event)"
            (retry)="vm.enter()"
          />
        }
        @case ("detail") {
          @if (vm.selected(); as estimate) {
            <nora-estimates-detail
              [estimate]="estimate"
              [items]="vm.detailItems()"
              [total]="vm.selectedTotal()"
              [statusLabels]="vm.statusLabels"
              [nextStatuses]="vm.nextStatuses()"
              [busy]="vm.busy()"
              (edit)="vm.edit()"
              (deleted)="vm.delete()"
              (statusChanged)="vm.changeStatus($event)"
            />
          }
        }
        @case ("form") {
          @if (vm.choosingCustomer()) {
            <nora-estimates-customer-picker
              [customers]="vm.customerChoices()"
              [search]="vm.customerSearch()"
              (searchChange)="vm.customerSearch.set($event)"
              (selected)="vm.chooseCustomer($event)"
            />
          } @else {
            <nora-estimates-form
              [form]="vm.form()"
              [customer]="vm.currentCustomer()"
              [busy]="vm.busy()"
              [preview]="vm.preview()"
              [currencies]="vm.currencies"
              [units]="vm.units"
              [itemTypes]="vm.itemTypes"
              (changed)="vm.updateForm($event)"
              (chooseCustomer)="vm.choosingCustomer.set(true)"
              (itemAdded)="vm.addItem()"
              (itemRemoved)="vm.removeItem($event)"
              (itemChanged)="vm.updateItem($event.index, $event.changes)"
            />
          }
        }
      }

      <view page-fab class="fab-layer" pointerEvents="box-none">
        @if (vm.screen() === "list") {
          <nora-fab
            label="Agregar presupuesto"
            [disabled]="vm.loading() || !!vm.error()"
            (pressed)="vm.create()"
          />
        }
      </view>
      <view page-footer>
        @if (vm.screen() === "form" && !vm.choosingCustomer()) {
          <view class="form-footer px-6 py-3"
            ><nora-button
              variant="primary"
              label="Guardar presupuesto"
              [text]="vm.busy() ? 'Guardando…' : 'Guardar borrador'"
              [disabled]="vm.busy() || vm.loading()"
              (pressed)="vm.save()"
          /></view>
        }
      </view>
    </nora-page-layout>
  `,
  styles: ":host { flex: 1; }",
})
export class EstimatesPageComponent {
  protected readonly vm = inject(EstimatesPageService);
  constructor() {
    this.vm.bindBack(inject(DestroyRef));
    void this.vm.enter();
  }
}
