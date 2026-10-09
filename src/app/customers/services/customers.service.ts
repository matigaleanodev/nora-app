import { inject, Injectable } from "@angular/core";
import { LocalStorageService } from "../../core/storage/local-storage.service";
import { assertUuid, IdService } from "../../shared/services/id.service";
import type {
  Customer,
  CustomerInput,
  CustomerAddress,
} from "../models/customer.model";

const STORAGE_KEY = "customers.v1";
@Injectable({ providedIn: "root" })
export class CustomersService {
  private readonly storage = inject(LocalStorageService);
  private readonly ids = inject(IdService);
  async getAll(): Promise<readonly Customer[]> {
    return (await this.storage.read<Customer[]>(STORAGE_KEY)) ?? [];
  }
  async getById(id: string): Promise<Customer | undefined> {
    return (await this.getAll()).find((customer) => customer.id === id);
  }

  async create(input: CustomerInput): Promise<Customer> {
    const data = await this.prepare(input);
    const now = new Date().toISOString();
    const customer: Customer = {
      ...data,
      id: await this.ids.create(),
      createdAt: now,
      updatedAt: now,
      archived: false,
    };
    await this.storage.update<Customer[]>(STORAGE_KEY, (current) => [
      ...(current ?? []),
      customer,
    ]);
    return customer;
  }

  async update(id: string, input: CustomerInput): Promise<Customer> {
    const data = await this.prepare(input);
    let result!: Customer;
    await this.storage.update<Customer[]>(STORAGE_KEY, (current) => {
      const customer = current?.find((value) => value.id === id);
      if (!customer) throw new Error("Cliente inexistente.");
      result = { ...customer, ...data, updatedAt: new Date().toISOString() };
      return current!.map((value) => (value.id === id ? result : value));
    });
    return result;
  }
  /** Archiva o restaura sin borrar al cliente ni romper referencias de presupuestos. */
  async setArchived(id: string, archived: boolean): Promise<void> {
    await this.storage.update<Customer[]>(STORAGE_KEY, (current) => {
      if (!current?.some((customer) => customer.id === id))
        throw new Error("Cliente inexistente.");
      return current.map((customer) =>
        customer.id === id
          ? { ...customer, archived, updatedAt: new Date().toISOString() }
          : customer,
      );
    });
  }
  private async prepare(
    input: CustomerInput,
  ): Promise<Omit<Customer, "id" | "createdAt" | "updatedAt" | "archived">> {
    if (!input.name?.trim()) throw new Error("El nombre es obligatorio.");
    if (
      input.phone &&
      (!/^\d{2,4}$/.test(input.phone.areaCode) ||
        !/^\d+$/.test(input.phone.number) ||
        input.phone.areaCode.startsWith("0") ||
        input.phone.areaCode.length + input.phone.number.length !== 10)
    ) {
      throw new Error(
        "Ingresá código de área sin 0 y número sin 15: diez dígitos en total.",
      );
    }
    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))
      throw new Error("Email inválido.");
    const addresses: CustomerAddress[] = await Promise.all(
      input.addresses.map(async (address) => {
        if (!address.name?.trim())
          throw new Error("Cada dirección necesita un nombre.");
        if (address.id) assertUuid(address.id);
        return {
          ...address,
          id: address.id ?? (await this.ids.create()),
          name: address.name.trim(),
        };
      }),
    );
    if (
      new Set(addresses.map((address) => address.id)).size !== addresses.length
    )
      throw new Error("Direcciones duplicadas.");
    return {
      name: input.name.trim(),
      phone: input.phone,
      addresses,
      email: input.email,
      notes: input.notes,
    };
  }
}
