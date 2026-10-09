import type { CustomerInput } from "./customer.model";
export interface CustomerForm {
  readonly name: string;
  readonly areaCode: string;
  readonly phoneNumber: string;
  readonly whatsapp: boolean;
  readonly email: string;
  readonly notes: string;
  readonly addresses: CustomerInput["addresses"];
}
