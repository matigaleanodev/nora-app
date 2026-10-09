import { Component, inject } from "@angular/core";
import { Pressable, Text, View } from "@ng-native/components";
import { TasksService } from "./tasks.service";

@Component({
  selector: "nora-home",
  imports: [Pressable, Text, View],
  template: `
    <view class="gap-6">
      <view class="gap-2">
        <text class="eyebrow">TU DÍA, MÁS SIMPLE</text>
        <text class="heading">Un poco de orden. Más tiempo para vos.</text>
        <text class="muted">Nora te ayuda a tener a mano lo que sigue.</text>
      </view>
      <view class="summary-card gap-3 rounded-3xl p-6">
        <text class="summary-label">TU AGENDA</text>
        <view class="flex-row items-end gap-3">
          <text class="summary-count">{{ tasks.pending() }}</text>
          <text class="summary-text">tareas pendientes</text>
        </view>
        <text class="summary-text">Una cosa a la vez. Vos podés.</text>
      </view>
      <view class="flex-row items-center justify-between">
        <text class="section-title">Próximos pasos</text>
        <text class="example-badge">EJEMPLOS</text>
      </view>
      @if (tasks.loading()) {
        <text class="muted">Cargando pendientes…</text>
      }
      <view class="gap-3">
        @for (task of tasks.tasks(); track task.id) {
          <pressable
            accessibilityRole="checkbox"
            [accessibilityLabel]="task.title"
            [accessibilityState]="{
              checked: task.done,
              disabled: tasks.loading() || tasks.saving(),
            }"
            [disabled]="tasks.loading() || tasks.saving()"
            (press)="tasks.toggle(task.id)"
            class="task-card flex-row items-center gap-4 rounded-2xl p-4"
          >
            <view
              class="task-check items-center justify-center"
              [class.task-check-done]="task.done"
            >
              @if (task.done) {
                <text class="check-mark">✓</text>
              }
            </view>
            <view class="flex-1 gap-1">
              <text class="task-category">{{ task.category }}</text>
              <text class="task-title" [class.task-title-done]="task.done">{{
                task.title
              }}</text>
              <text class="task-detail">{{ task.detail }}</text>
            </view>
          </pressable>
        }
      </view>
      <text class="footnote"
        >Vista inicial con datos de ejemplo. Podés marcar tareas; los cambios se
        guardan en este teléfono.</text
      >
    </view>
  `,
  styles: ":host { flex: 1; }",
})
export class HomeComponent {
  protected readonly tasks = inject(TasksService);
}
