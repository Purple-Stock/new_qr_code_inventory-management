import { faker } from "@faker-js/faker/locale/pt_BR";
import {
  initialLocationSelectValue,
  locationsForStockSelect,
} from "@/lib/initial-location-select";

faker.seed(20261030);

function makeLocation(overrides: { id?: number; name: string }) {
  return {
    id: overrides.id ?? faker.number.int({ min: 100, max: 999 }),
    name: overrides.name,
  };
}

describe("locationsForStockSelect", () => {
  it("hides the leftover signup Default Location when the team already has real bins", () => {
    const leftover = makeLocation({ id: 133, name: "Default Location" });
    const bin = makeLocation({ id: 135, name: "E01-M01-N01-C01" });
    const other = makeLocation({ id: 136, name: "E01-M01-N01-C02" });

    expect(locationsForStockSelect([leftover, bin, other])).toEqual([bin, other]);
  });

  it("keeps Default Location when it is the only place on the team", () => {
    const leftover = makeLocation({ id: 133, name: "Default Location" });
    expect(locationsForStockSelect([leftover])).toEqual([leftover]);
  });
});

describe("initialLocationSelectValue", () => {
  it("does not preselect Default Location when several bins exist", () => {
    const locations = [
      makeLocation({ id: 133, name: "Default Location" }),
      makeLocation({ id: 135, name: "E01-M01-N01-C01" }),
      makeLocation({ id: 136, name: "E01-M01-N01-C02" }),
    ];

    expect(initialLocationSelectValue(locations)).toBe("");
  });

  it("preselects the only remaining location", () => {
    const bin = makeLocation({ id: 135, name: "E01-M01-N01-C01" });
    expect(initialLocationSelectValue([bin])).toBe("135");
  });
});
