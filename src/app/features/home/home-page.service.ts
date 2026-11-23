import { Injectable, inject, signal, computed } from "@angular/core";
import { BusinessProfileService } from "../../business/services/business-profile.service";
import { BusinessPageService } from "../../business/services/business-page.service";
import type { BusinessProfile } from "../../business/models/business-profile.model";
import { EstimatesService } from "../../estimates/services/estimates.service";
import { EstimateRecoveryService } from "../../estimates/services/estimate-recovery.service";
import {
  EstimateStatus,
  type Estimate,
} from "../../estimates/models/estimate.model";
import { STATUS_LABELS } from "../../estimates/services/estimates-page.service";
import { calculateEstimateTotal } from "../../estimates/utils/estimate-totals";
import type { Visit } from "../../agenda/models/visit.model";
import { AgendaPageService } from "../../agenda/services/agenda-page.service";
import { VisitsService } from "../../agenda/services/visits.service";
import {
  describeVisit,
  describeWhen,
  groupVisits,
} from "../../agenda/utils/visit-format";
import { calendarDateFromLocal } from "../../shared/utils/calendar-date";
@Injectable({ providedIn: "root" })
export class HomePageService {
  readonly business = inject(BusinessPageService);
  readonly agenda = inject(AgendaPageService);
  private readonly visits = inject(VisitsService);
  private readonly profiles = inject(BusinessProfileService);
  private readonly estimates = inject(EstimatesService);
  private readonly recovery = inject(EstimateRecoveryService);
  readonly profile = signal<BusinessProfile | null>(null);
  private readonly records = signal<readonly Estimate[]>([]);
  private readonly incomplete = signal(0);
  readonly error = signal("");
  readonly loading = signal(true);
  readonly dismissed = signal(false);
  readonly labels = STATUS_LABELS;
  private readonly agendaRecords = signal<readonly Visit[]>([]);
  readonly today = signal(calendarDateFromLocal(new Date()));
  /** Vencidas, de hoy y las próximas, hasta 3 para no llenar Inicio. */
  readonly agendaPreview = computed(() => {
    const groups = groupVisits(this.agendaRecords(), this.today());
    return [...groups.overdue, ...groups.today, ...groups.upcoming].slice(0, 3);
  });
  describeAgenda(visit: Visit): string {
    return `${describeWhen(visit, this.today())} · ${describeVisit(visit)}`;
  }
  readonly drafts = computed(
    () =>
      this.records().filter((value) => value.status === EstimateStatus.Draft)
        .length + this.incomplete(),
  );
  readonly sent = computed(
    () =>
      this.records().filter((value) => value.status === EstimateStatus.Sent)
        .length,
  );
  readonly recent = computed(() =>
    [...this.records()]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5),
  );
  estimateTotal(estimate: Estimate): number {
    return calculateEstimateTotal(estimate.items);
  }
  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set("");
    try {
      this.today.set(calendarDateFromLocal(new Date()));
      const [profile, records, recoveries, visits] = await Promise.all([
        this.profiles.get(),
        this.estimates.getAll(),
        this.recovery.getAll(),
        // La agenda es complementaria: si falla no bloquea Inicio.
        this.visits.getAll().catch(() => [] as readonly Visit[]),
      ]);
      this.agendaRecords.set(visits);
      this.profile.set(profile);
      this.records.set(records);
      this.incomplete.set(
        recoveries.filter((value) => !value.estimateId).length,
      );
    } catch {
      this.error.set("No pudimos cargar tu negocio. Volvé a intentarlo.");
    } finally {
      this.loading.set(false);
    }
  }
}
