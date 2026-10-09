import type { Estimate, EstimateItem } from "./estimate.model";
export interface EstimateListRow {
  readonly estimate: Estimate;
  readonly totalCents: number;
}
export interface EstimateItemRow {
  readonly item: EstimateItem;
  readonly subtotalCents: number;
  readonly unitLabel: string;
}
export interface EstimatePreview {
  readonly total: number | null;
  readonly subtotals: readonly number[];
  readonly error: string;
}
