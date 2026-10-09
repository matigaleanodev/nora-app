import { Injectable } from "@angular/core";
import type { SQLiteDatabase } from "expo-sqlite";

@Injectable({ providedIn: "root" })
export class LocalStorageService {
  private database?: Promise<SQLiteDatabase>;
  private mutationQueue: Promise<unknown> = Promise.resolve();

  /** Lee JSON local; devuelve null si no existe. El tipo T no implica validación del contenido. */
  async read<T>(key: string): Promise<T | null> {
    const database = await this.open();
    const row = await database.getFirstAsync<{ value: string }>(
      "SELECT value FROM app_storage WHERE key = ?",
      key,
    );
    return row ? (JSON.parse(row.value) as T) : null;
  }

  async write<T>(key: string, value: T): Promise<void> {
    const database = await this.open();
    await database.runAsync(
      "INSERT INTO app_storage (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      key,
      JSON.stringify(value),
    );
  }

  /**
   * Serializa lectura, modificación y guardado para evitar perder cambios concurrentes.
   * La exclusión sólo aplica a llamadas a update en esta instancia, no a otros procesos ni a write.
   * Propaga el fallo al consumidor sin bloquear las siguientes operaciones de la cola.
   */
  update<T>(key: string, change: (current: T | null) => T): Promise<void> {
    const operation = this.mutationQueue.then(async () => {
      const next = change(await this.read<T>(key));
      await this.write(key, next);
    });
    this.mutationQueue = operation.catch(() => undefined);
    return operation;
  }

  private open(): Promise<SQLiteDatabase> {
    // Comparte la apertura en curso y permite reintentar si la inicialización falla.
    return (this.database ??= this.initialize().catch((error: unknown) => {
      this.database = undefined;
      throw error;
    }));
  }

  private async initialize(): Promise<SQLiteDatabase> {
    const { openDatabaseAsync } = await import("expo-sqlite");
    const database = await openDatabaseAsync("nora.db");
    await database.execAsync(
      "CREATE TABLE IF NOT EXISTS app_storage (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)",
    );
    return database;
  }
}
