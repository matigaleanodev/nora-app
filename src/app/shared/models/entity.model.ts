export type UUID = string;
export interface Entity {
  readonly id: UUID;
  readonly createdAt: string;
  readonly updatedAt: string;
}
