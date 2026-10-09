import { expect, test } from "vitest";
import { readNativeText } from "./native-text";
test.each([
  "ana@gmail.com",
  { text: "ana@gmail.com" },
  { nativeEvent: { text: "ana@gmail.com" } },
])("captura el texto autocompletado sin convertirlo ni truncarlo", (value) => {
  expect(readNativeText(value)).toBe("ana@gmail.com");
});
test.each([undefined, null, {}, { nativeEvent: { text: undefined } }])(
  "ignora eventos sin texto para no reemplazar un campo válido con undefined",
  (value) => {
    expect(readNativeText(value)).toBeNull();
  },
);
test("permite borrar un campo intencionalmente", () => {
  expect(readNativeText({ nativeEvent: { text: "" } })).toBe("");
});
