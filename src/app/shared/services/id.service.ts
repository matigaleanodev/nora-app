import { Injectable } from "@angular/core";
import type { UUID } from "../models/entity.model";
@Injectable({ providedIn: "root" })
export class IdService {
  async create(): Promise<UUID> {
    const { randomUUID } = await import("expo-crypto");
    return randomUUID();
  }
}

export function assertUuid(id: string): void {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  ) {
    throw new Error("Identificador UUID inválido.");
  }
}
