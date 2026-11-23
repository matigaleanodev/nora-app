import { vi } from "vitest";
import { LocalStorageService } from "../../core/storage/local-storage.service";

export function createMemoryStorage() {
  const records = new Map<string, unknown>();
  const storage = new LocalStorageService();
  const write = vi.fn(async (key: string, value: unknown) => {
    records.set(key, value);
  });
  const getFirstAsync = async (_sql: string, key: string) =>
    records.has(key) ? { value: JSON.stringify(records.get(key)) } : null;
  const getAllAsync = async (_sql: string, ...keys: string[]) =>
    keys
      .filter((key) => records.has(key))
      .map((key) => ({
        key,
        value: JSON.stringify(records.get(key)),
      }));
  const runAsync = async (sql: string, key: string, json?: string) => {
    if (sql.startsWith("DELETE")) records.delete(key);
    else await write(key, JSON.parse(json!) as unknown);
  };
  const connection = { getFirstAsync, getAllAsync, runAsync };
  const database = {
    ...connection,
    withExclusiveTransactionAsync: async (
      task: (tx: typeof connection) => Promise<void>,
    ) => {
      const before = new Map(records);
      try {
        await task(connection);
      } catch (error) {
        records.clear();
        for (const [key, value] of before) records.set(key, value);
        throw error;
      }
    },
  };
  vi.spyOn(
    storage as unknown as { open(): Promise<typeof database> },
    "open",
  ).mockResolvedValue(database);
  return { storage, write, records };
}
