import { EstimateItemEditorComponent } from "../components/estimate-item-editor.component";
import { EstimateConditionsComponent } from "../components/estimate-conditions.component";
import { MoneyPipe } from "../../shared/pipes/money.pipe";
import { Component, DestroyRef, inject } from "@angular/core";
import { Text, View } from "@ng-native/components";
import { PageLayoutComponent } from "../../shared/components/page-layout/page-layout.component";
import { ActionButtonComponent } from "../../shared/components/action-button/action-button.component";
import { EstimatesPageService } from "../services/estimates-page.service";
import { EstimatesListComponent } from "../components/estimates-list.component";
import { EstimatesDetailComponent } from "../components/estimates-detail.component";
import { EstimatesFormComponent } from "../components/estimates-form.component";
import { EstimatesCustomerPickerComponent } from "../components/estimates-customer-picker.component";
@Component({
  selector: "nora-estimates",
  imports: [
    Text,
    EstimateItemEditorComponent,
    EstimateConditionsComponent,
    MoneyPipe,
    View,
    PageLayoutComponent,
    ActionButtonComponent,
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
            [statusFilter]="vm.statusFilter()"
            (statusFilterChange)="vm.statusFilter.set($event)"
            [rows]="vm.listRows()"
            [statusLabels]="vm.statusLabels"
            [loading]="vm.loading()"
            [error]="vm.error()"
            [search]="vm.search()"
            (opened)="vm.open($event)"
            (searchChange)="vm.search.set($event)"
            (retry)="vm.enter()"
          />
          @for (recovery of vm.visibleRecoveries(); track recovery.id) {
            <view class="compact-row gap-2">
              <text class="body-text">{{
                recovery.form.number || "Presupuesto sin completar"
              }}</text>
              <text class="muted"
                >{{
                  recovery.form.description || "Faltan datos para revisar"
                }}
                · {{ recovery.updatedAt }}</text
              >
              <nora-button
                text="Continuar edición"
                [label]="
                  'Continuar ' +
                  (recovery.form.number || 'presupuesto sin completar')
                "
                (pressed)="vm.resume(recovery)"
              />
              <nora-button
                text="Eliminar edición guardada"
                variant="danger"
                (pressed)="vm.deleteRecovery(recovery)"
              />
            </view>
          }
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
          <text class="footnote" accessibilityLiveRegion="polite">{{
            vm.saveLabel()
          }}</text>
          @if (vm.saveState() === "failed") {
            <nora-button
              text="Reintentar guardado"
              (pressed)="vm.retrySave()"
            />
          }
          @if (vm.editingConditions()) {
            <nora-estimate-conditions
              [form]="vm.form()"
              [busy]="vm.busy()"
              (changed)="vm.updateForm($event)"
            />
          } @else if (vm.activeEditor(); as editor) {
            <nora-estimate-item-editor
              [item]="editor.item"
              [index]="editor.index ?? vm.form().items.length"
              [currency]="vm.form().currency"
              [subtotal]="vm.editorSubtotal()"
              [units]="vm.units"
              [itemTypes]="vm.itemTypes"
              [busy]="vm.busy()"
              (changed)="vm.updateEditor($event)"
            />
            @if (vm.editorError()) {
              <text class="error-text">{{ vm.editorError() }}</text>
            }
          } @else if (vm.choosingCustomer()) {
            <nora-estimates-customer-picker
              [customers]="vm.customerChoices()"
              [search]="vm.customerSearch()"
              (searchChange)="vm.customerSearch.set($event)"
              (selected)="vm.chooseCustomer($event)"
            />
          } @else {
            @if (vm.editor()) {
              <nora-button
                text="Continuar material o tarea pendiente"
                (pressed)="vm.editorVisible.set(true)"
              />
            }
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
              (typeAdded)="vm.addItem($event)"
              (itemEdited)="vm.editItem($event)"
              (conditionsEdited)="vm.editingConditions.set(true)"
            />
          }
        }
      }

      <view page-footer>
        @if (vm.screen() === "detail") {
          <view class="form-footer px-4 py-3"
            ><nora-button
              variant="primary"
              label="Compartir PDF"
              [text]="vm.busy() ? 'Preparando…' : 'Compartir PDF'"
              [disabled]="vm.busy()"
              (pressed)="vm.sharePdf()"
          /></view>
        }
        @if (vm.screen() === "list") {
          <view class="form-footer px-4 py-3"
            ><nora-button
              text="Nuevo presupuesto"
              label="Agregar presupuesto"
              variant="primary"
              [disabled]="vm.loading() || !!vm.error()"
              (pressed)="vm.create()"
          /></view>
        }
        @if (vm.screen() === "form" && !vm.choosingCustomer()) {
          <view class="form-footer px-4 py-3 gap-2">
            @if (vm.editingConditions()) {
              <nora-button
                text="Volver al presupuesto"
                variant="primary"
                [disabled]="vm.busy()"
                (pressed)="vm.back()"
              />
            } @else if (vm.activeEditor(); as editor) {
              <nora-button
                variant="primary"
                [text]="editor.index === null ? 'Agregar' : 'Guardar cambios'"
                (pressed)="vm.confirmItem()"
              />
              @if (editor.index === null) {
                <nora-button
                  text="Agregar y cargar otro"
                  (pressed)="vm.confirmItem(true)"
                />
              } @else {
                <nora-button
                  text="Eliminar"
                  variant="danger"
                  (pressed)="vm.removeItem(editor.index)"
                />
              }
              <nora-button text="Cancelar" (pressed)="vm.cancelItem()" />
            } @else {
              @if (vm.preview().total !== null) {
                <text class="section-title"
                  >Total ·
                  {{ vm.preview().total! | money: vm.form().currency }}</text
                >
              }
              <nora-button
                variant="primary"
                label="Revisar presupuesto"
                [text]="vm.busy() ? 'Revisando…' : 'Revisar presupuesto'"
                [disabled]="vm.busy() || vm.loading()"
                (pressed)="vm.save()"
              />
            }
          </view>
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
