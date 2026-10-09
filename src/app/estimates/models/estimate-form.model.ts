import type {
  Currency,
  EstimateItemType,
  MeasurementUnit,
} from "./estimate.model";
export interface EstimateItemForm {
  readonly id?: string;
  readonly description: string;
  readonly type: EstimateItemType;
  readonly quantity: string;
  readonly unit: MeasurementUnit;
  readonly price: string;
}
export interface EstimateForm {
  readonly number: string;
  readonly clientId: string;
  readonly addressId: string;
  readonly description: string;
  readonly currency: Currency;
  readonly validUntil: string;
  readonly notes: string;
  readonly items: readonly EstimateItemForm[];
}
