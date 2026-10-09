import { Pipe, type PipeTransform } from "@angular/core";
import { Currency } from "../../estimates/models/estimate.model";

@Pipe({ name: "money" })
export class MoneyPipe implements PipeTransform {
  private readonly formatter = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  transform(cents: number, currency: Currency): string {
    return `${currency === Currency.USD ? "US$" : "$"} ${this.formatter.format(cents / 100)}`;
  }
}
