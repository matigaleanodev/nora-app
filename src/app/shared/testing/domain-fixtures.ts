import type { Customer } from "../../customers/models/customer.model";
import {
  Currency,
  EstimateStatus,
  EstimateItemType,
  MeasurementUnit,
  type Estimate,
} from "../../estimates/models/estimate.model";
export const customerFixture: Customer = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Ana García",
  phone: { areaCode: "376", number: "4123456", whatsapp: true },
  email: "ana@example.com",
  notes: "Llamar a la tarde",
  addresses: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      name: "Casa",
      street: "San Martín",
      streetNumber: "123",
      city: "Posadas",
      province: "Misiones",
      floor: "2",
      apartment: "B",
    },
  ],
  archived: false,
  createdAt: "2026-10-08T12:00:00Z",
  updatedAt: "2026-10-08T12:00:00Z",
};
export const estimateFixture: Estimate = {
  id: "33333333-3333-4333-8333-333333333333",
  number: "P-001",
  clientId: customerFixture.id,
  customerSnapshot: {
    name: customerFixture.name,
    phone: customerFixture.phone,
    email: customerFixture.email,
    address: customerFixture.addresses[0],
  },
  description: "Pintura de cocina",
  currency: Currency.ARS,
  status: EstimateStatus.Draft,
  items: [
    {
      id: "44444444-4444-4444-8444-444444444444",
      description: "Pintura blanca",
      type: EstimateItemType.Material,
      quantity: 2,
      unit: MeasurementUnit.Liter,
      unitPriceCents: 125050,
    },
  ],
  notes: "Incluye limpieza",
  validUntil: "2026-12-31",
  createdAt: "2026-10-08T12:00:00Z",
  updatedAt: "2026-10-08T12:00:00Z",
};
