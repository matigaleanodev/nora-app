import { Pipe, type PipeTransform } from "@angular/core";
import type { Currency } from "../../estimates/models/estimate.model";
import { formatMoney } from "../utils/money-format";

@Pipe({ name: "money" })
export class MoneyPipe implements PipeTransform {
  transform(cents: number, currency: Currency): string {
    return formatMoney(cents, currency);
  }
}
