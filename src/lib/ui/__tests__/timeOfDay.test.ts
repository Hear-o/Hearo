import { getTimeOfDay, getDefaultSceneForTimeOfDay } from "@/lib/ui/timeOfDay";

// Pure-function band logic. Each branch maps to a different default scene, so
// a wrong band picks the wrong opening shot. Cover each side of every boundary.
function at(hour: number): Date {
  const d = new Date(2026, 0, 1, hour, 0, 0); // arbitrary date, hour we want
  return d;
}

describe("timeOfDay", () => {
  describe("getTimeOfDay", () => {
    it("returns 'morning' from 05:00 through 11:59", () => {
      expect(getTimeOfDay(at(5))).toBe("morning");
      expect(getTimeOfDay(at(8))).toBe("morning");
      expect(getTimeOfDay(at(11))).toBe("morning");
    });

    it("returns 'afternoon' from 12:00 through 17:59", () => {
      expect(getTimeOfDay(at(12))).toBe("afternoon");
      expect(getTimeOfDay(at(15))).toBe("afternoon");
      expect(getTimeOfDay(at(17))).toBe("afternoon");
    });

    it("returns 'evening' from 18:00 through 22:59", () => {
      expect(getTimeOfDay(at(18))).toBe("evening");
      expect(getTimeOfDay(at(20))).toBe("evening");
      expect(getTimeOfDay(at(22))).toBe("evening");
    });

    it("returns 'night' from 23:00 through 04:59", () => {
      expect(getTimeOfDay(at(23))).toBe("night");
      expect(getTimeOfDay(at(0))).toBe("night");
      expect(getTimeOfDay(at(3))).toBe("night");
      expect(getTimeOfDay(at(4))).toBe("night");
    });

    it("defaults to 'now' when no Date is provided", () => {
      // We can't assert a specific band without knowing the wall clock, but we
      // can assert the function returns *something* valid.
      const result = getTimeOfDay();
      expect(["morning", "afternoon", "evening", "night"]).toContain(result);
    });
  });

  describe("getDefaultSceneForTimeOfDay", () => {
    it("maps each band to its scene", () => {
      expect(getDefaultSceneForTimeOfDay(at(8))).toBe("cafe");
      expect(getDefaultSceneForTimeOfDay(at(14))).toBe("park");
      expect(getDefaultSceneForTimeOfDay(at(19))).toBe("beach");
      expect(getDefaultSceneForTimeOfDay(at(2))).toBe("road");
    });
  });
});
