import { Component, DestroyRef, inject } from "@angular/core";
import { Pressable, Text, View } from "@ng-native/components";
import { ActionButtonComponent } from "../../shared/components/action-button/action-button.component";
import { DateFieldComponent } from "../../shared/components/date-field/date-field.component";
import { FormFieldComponent } from "../../shared/components/form-field/form-field.component";
import { PageLayoutComponent } from "../../shared/components/page-layout/page-layout.component";
import { TimeFieldComponent } from "../../shared/components/time-field/time-field.component";
import { VisitRowComponent } from "../components/visit-row.component";
import { VisitKind, VISIT_KIND_LABELS } from "../models/visit.model";
import { AgendaPageService } from "../services/agenda-page.service";

@Component({
  selector: "nora-agenda",
  imports: [
    ActionButtonComponent,
    DateFieldComponent,
    FormFieldComponent,
    PageLayoutComponent,
    Pressable,
    Text,
    TimeFieldComponent,
    View,
    VisitRowComponent,
  ],
  template: `<nora-page-layout
    [title]="vm.title()"
    backLabel="Volver"
    [busy]="vm.busy()"
    [error]="vm.error()"
    [resetKey]="vm.screen()"
    (back)="vm.back()"
  >
    @switch (vm.screen()) {
      @case ("list") {
        @if (vm.loading()) {
          <text class="muted">Cargando agenda…</text>
        } @else if (vm.sections().length === 0) {
          <view class="task-card rounded-lg p-4 gap-2">
            <text class="section-title">Sin visitas pendientes</text>
            <text class="muted"
              >Agendá visitas y seguimientos de presupuestos para que Nora te
              avise a tiempo.</text
            >
          </view>
        }
        @for (section of vm.sections(); track section.key) {
          <view class="gap-2">
            <text class="section-title">{{ section.title }}</text>
            @for (visit of section.items; track visit.id) {
              <nora-visit-row
                [visit]="visit"
                [today]="vm.today()"
                [busy]="vm.busy()"
                (opened)="vm.edit($event)"
                (toggled)="vm.toggleDone($event)"
              />
            }
          </view>
        }
        @if (vm.hasDone()) {
          <nora-button
            variant="link"
            [text]="vm.showDone() ? 'Ocultar hechas' : 'Ver hechas'"
            (pressed)="vm.showDone.set(!vm.showDone())"
          />
        }
      }
      @case ("form") {
        <nora-field
          label="Título"
          [required]="true"
          placeholder="Ej.: Revisar instalación"
          [value]="vm.form().title"
          [disabled]="vm.busy()"
          (valueChange)="vm.update({ title: $event })"
        />
        <view class="gap-2">
          <text class="field-label">Tipo</text>
          <view class="flex-row gap-2">
            @for (kind of kinds; track kind.value) {
              <nora-button
                variant="choice"
                [text]="kind.label"
                [selected]="vm.form().kind === kind.value"
                [disabled]="vm.busy()"
                (pressed)="vm.update({ kind: kind.value })"
              />
            }
          </view>
        </view>
        <nora-date-field
          label="Fecha *"
          [value]="vm.form().date"
          [disabled]="vm.busy()"
          (valueChange)="vm.update({ date: $event })"
        />
        <nora-time-field
          label="Hora"
          [value]="vm.form().time"
          [disabled]="vm.busy()"
          (valueChange)="vm.update({ time: $event })"
        />
        <view class="gap-2">
          <text class="field-label">Cliente</text>
          <text class="body-text">{{
            vm.form().customerName || "Sin cliente"
          }}</text>
          @if (vm.form().estimateNumber) {
            <text class="footnote"
              >Presupuesto {{ vm.form().estimateNumber }}</text
            >
          }
          <view class="flex-row gap-2">
            <nora-button
              variant="secondary"
              [text]="
                vm.form().customerId ? 'Cambiar cliente' : 'Elegir cliente'
              "
              [disabled]="vm.busy()"
              (pressed)="vm.chooseCustomer()"
            />
            @if (vm.form().customerId) {
              <nora-button
                variant="link"
                text="Quitar"
                label="Quitar cliente"
                [disabled]="vm.busy()"
                (pressed)="vm.pickCustomer(null)"
              />
            }
          </view>
        </view>
        <nora-field
          label="Notas"
          [multiline]="true"
          [value]="vm.form().notes"
          [disabled]="vm.busy()"
          (valueChange)="vm.update({ notes: $event })"
        />
        @if (vm.editing()) {
          <nora-button
            variant="danger-link"
            text="Eliminar visita"
            [disabled]="vm.busy()"
            (pressed)="vm.remove()"
          />
        }
      }
      @case ("customer") {
        <nora-field
          label="Buscar cliente"
          [value]="vm.search()"
          (valueChange)="vm.search.set($event)"
        />
        @for (customer of vm.customerOptions(); track customer.id) {
          <pressable
            class="compact-row gap-1"
            accessibilityRole="button"
            [accessibilityLabel]="'Elegir ' + customer.name"
            (press)="vm.pickCustomer(customer)"
          >
            <text class="task-title">{{ customer.name }}</text>
          </pressable>
        } @empty {
          <text class="muted">No hay clientes que coincidan.</text>
        }
      }
    }

    <view page-footer>
      @if (vm.screen() === "list") {
        <view class="form-footer px-4 py-3"
          ><nora-button
            text="Nueva visita"
            label="Agregar visita"
            variant="primary"
            [disabled]="vm.loading() || vm.busy()"
            (pressed)="vm.create()"
        /></view>
      } @else if (vm.screen() === "form") {
        <view class="form-footer px-4 py-3"
          ><nora-button
            text="Guardar visita"
            variant="primary"
            [disabled]="vm.busy()"
            (pressed)="vm.save()"
        /></view>
      }
    </view>
  </nora-page-layout>`,
  styles: ":host { flex: 1; }",
})
export class AgendaPageComponent {
  protected readonly vm = inject(AgendaPageService);
  protected readonly kinds = [VisitKind.Visit, VisitKind.FollowUp].map(
    (value) => ({ value, label: VISIT_KIND_LABELS[value] }),
  );
  constructor() {
    this.vm.bindBack(inject(DestroyRef));
  }
}
