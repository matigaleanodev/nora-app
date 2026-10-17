import { Injectable, inject } from "@angular/core";
import { LocalStorageService } from "../../core/storage/local-storage.service";
import type {
  EstimateForm,
  EstimateItemForm,
} from "../models/estimate-form.model";
import {
  Currency,
  EstimateItemType,
  MeasurementUnit,
} from "../models/estimate.model";
import { assertUuid } from "../../shared/services/id.service";
export interface EstimateEditorRecovery {
  readonly index: number | null;
  readonly item: EstimateItemForm;
}
export interface EstimateRecovery {
  readonly id: string;
  readonly estimateId: string | null;
  readonly form: EstimateForm;
  readonly editor: EstimateEditorRecovery | null;
  readonly updatedAt: string;
}
const KEY = "estimate-recovery.v1";
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
function item(value: unknown): value is EstimateItemForm {
  return (
    object(value) &&
    ["description", "quantity", "price"].every(
      (key) => typeof value[key] === "string",
    ) &&
    Object.values(EstimateItemType).includes(
      value["type"] as EstimateItemType,
    ) &&
    Object.values(MeasurementUnit).includes(value["unit"] as MeasurementUnit) &&
    (value["id"] === undefined || typeof value["id"] === "string")
  );
}
function valid(value: unknown): value is EstimateRecovery {
  if (
    !object(value) ||
    typeof value["id"] !== "string" ||
    typeof value["updatedAt"] !== "string" ||
    !Number.isFinite(Date.parse(value["updatedAt"])) ||
    (value["estimateId"] !== null && typeof value["estimateId"] !== "string")
  )
    return false;
  try {
    assertUuid(value["id"]);
    if (value["estimateId"]) assertUuid(value["estimateId"] as string);
  } catch {
    return false;
  }
  const form = value["form"];
  if (
    !object(form) ||
    ![
      "number",
      "clientId",
      "addressId",
      "description",
      "validUntil",
      "notes",
    ].every((key) => typeof form[key] === "string") ||
    !Object.values(Currency).includes(form["currency"] as Currency) ||
    !Array.isArray(form["items"]) ||
    !form["items"].every(item)
  )
    return false;
  const editor = value["editor"];
  return (
    editor === null ||
    (object(editor) &&
      item(editor["item"]) &&
      (editor["index"] === null ||
        (Number.isInteger(editor["index"]) &&
          (editor["index"] as number) >= 0 &&
          (editor["index"] as number) < form["items"].length)))
  );
}
/** Conserva texto transitorio separado del documento validado y de sus snapshots. */
@Injectable({ providedIn: "root" })
export class EstimateRecoveryService {
  private readonly storage = inject(LocalStorageService);
  async getAll(): Promise<readonly EstimateRecovery[]> {
    return this.read(await this.storage.read<unknown>(KEY));
  }
  save(value: EstimateRecovery): Promise<void> {
    if (!valid(value))
      return Promise.reject(
        new Error("No pudimos conservar esta edición. Revisá los datos."),
      );
    const snapshot = structuredClone(value);
    return this.storage.update<unknown>(KEY, (current) => [
      ...this.read(current).filter((record) => record.id !== snapshot.id),
      snapshot,
    ]);
  }
  remove(id: string): Promise<void> {
    return this.storage.update<unknown>(KEY, (current) =>
      this.read(current).filter((record) => record.id !== id),
    );
  }
  private read(value: unknown): readonly EstimateRecovery[] {
    if (value === null) return [];
    if (!Array.isArray(value) || !value.every(valid))
      throw new Error(
        "No pudimos leer las ediciones guardadas. Los datos originales se conservaron.",
      );
    return value;
  }
}
