import type { Entity, UUID } from "../../shared/models/entity.model";

export enum VisitKind {
  Visit = "visit",
  FollowUp = "follow-up",
}
export enum VisitStatus {
  Pending = "pending",
  Done = "done",
}
export const VISIT_KIND_LABELS: Readonly<Record<VisitKind, string>> = {
  [VisitKind.Visit]: "Visita",
  [VisitKind.FollowUp]: "Seguimiento",
};

/** Visita o seguimiento agendado. El cliente y el presupuesto se copian para mostrarlos aunque cambien después. */
export interface Visit extends Entity {
  readonly title: string;
  readonly kind: VisitKind;
  readonly status: VisitStatus;
  /** Fecha de calendario yyyy-MM-dd, sin huso horario. */
  readonly date: string;
  /** Hora local HH:mm; sin hora el aviso llega a la mañana del día. */
  readonly time?: string;
  readonly customerId?: UUID;
  readonly customerName?: string;
  readonly estimateId?: UUID;
  readonly estimateNumber?: string;
  readonly notes?: string;
  /** Identificador del aviso local programado en este teléfono; no viaja en las copias de seguridad. */
  readonly reminderId?: string;
}
export interface VisitInput {
  readonly title: string;
  readonly kind: VisitKind;
  readonly date: string;
  readonly time?: string;
  readonly customerId?: UUID;
  readonly customerName?: string;
  readonly estimateId?: UUID;
  readonly estimateNumber?: string;
  readonly notes?: string;
}
/** Formulario de texto: cada campo se valida recién al guardar. */
export interface VisitForm {
  readonly title: string;
  readonly kind: VisitKind;
  readonly date: string;
  readonly time: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly estimateId: string;
  readonly estimateNumber: string;
  readonly notes: string;
}
