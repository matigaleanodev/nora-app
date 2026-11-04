import { Component, input, output } from "@angular/core";
import { Pressable, Text, View } from "@ng-native/components";
import { ActionButtonComponent } from "../../shared/components/action-button/action-button.component";
import { VisitStatus, type Visit } from "../models/visit.model";
import { describeVisit, describeWhen } from "../utils/visit-format";

@Component({
  selector: "nora-visit-row",
  imports: [ActionButtonComponent, Pressable, Text, View],
  template: `<view class="flex-row items-center gap-2">
    <pressable
      class="compact-row flex-1 gap-1"
      accessibilityRole="button"
      [accessibilityLabel]="'Abrir ' + visit().title"
      (press)="opened.emit(visit())"
    >
      <text class="task-title">{{ visit().title }}</text>
      <text class="body-text">{{ when() }}</text>
      <text class="footnote">{{ detail() }}</text>
    </pressable>
    <nora-button
      variant="secondary"
      [text]="done() ? 'Reabrir' : 'Hecha'"
      [label]="(done() ? 'Reabrir ' : 'Marcar hecha ') + visit().title"
      [disabled]="busy()"
      (pressed)="toggled.emit(visit())"
    />
  </view>`,
})
export class VisitRowComponent {
  readonly visit = input.required<Visit>();
  readonly today = input.required<string>();
  readonly busy = input(false);
  readonly opened = output<Visit>();
  readonly toggled = output<Visit>();
  protected done(): boolean {
    return this.visit().status === VisitStatus.Done;
  }
  protected when(): string {
    return describeWhen(this.visit(), this.today());
  }
  protected detail(): string {
    return describeVisit(this.visit());
  }
}
