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
@Injectable({ providedIn: "root" })
export class HomePageService {
  readonly business = inject(BusinessPageService);
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
      const [profile, records, recoveries] = await Promise.all([
        this.profiles.get(),
        this.estimates.getAll(),
        this.recovery.getAll(),
      ]);
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
