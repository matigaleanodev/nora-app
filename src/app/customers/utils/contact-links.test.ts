import { describe, expect, test } from "vitest";
import {
  addressQuery,
  canOpenMap,
  emailLink,
  mapsLink,
  phoneLink,
  whatsappLink,
} from "./contact-links";
import { customerFixture } from "../../shared/testing/domain-fixtures";

const address = customerFixture.addresses[0]!;
const phone = customerFixture.phone!;

describe("enlaces de contacto", () => {
  test("arma teléfono y WhatsApp con el prefijo +549 de Argentina", () => {
    expect(phoneLink(phone)).toBe("tel:+5493764123456");
    expect(whatsappLink(phone)).toBe("https://wa.me/5493764123456");
  });
  test("arma el correo sin espacios sobrantes", () => {
    expect(emailLink(" ana@example.com ")).toBe("mailto:ana@example.com");
  });
  test("busca la dirección con calle, número, ciudad y provincia, escapando el texto", () => {
    expect(addressQuery(address)).toBe("San Martín 123, Posadas, Misiones");
    expect(mapsLink(address)).toBe(
      "https://www.google.com/maps/search/?api=1&query=San%20Mart%C3%ADn%20123%2C%20Posadas%2C%20Misiones%2C%20Argentina",
    );
  });
  test("tolera direcciones incompletas y no ofrece el mapa sin calle ni ciudad", () => {
    const partial = { ...address, streetNumber: "", province: "" };
    expect(addressQuery(partial)).toBe("San Martín, Posadas");
    const empty = { ...address, street: " ", city: "" };
    expect(canOpenMap(partial)).toBe(true);
    expect(canOpenMap(empty)).toBe(false);
  });
  test("no deja que el texto de la dirección altere la consulta", () => {
    const tricky = { ...address, street: "A&query=otra#x", streetNumber: "1" };
    const link = mapsLink(tricky);
    expect(link.match(/query=/g)).toHaveLength(1);
    expect(link).not.toContain("#");
  });
});
