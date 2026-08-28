import { describe, expect, it } from "vitest";
import { GRID_HEIGHT_PX, GRID_MINUTES, HOUR_HEIGHT_PX, layoutEvents, MIN_BLOCK_PX, minutesFromGridStart, PX_PER_MINUTE, snapMinutes } from "./layout";

const at = (h: number, m = 0, durationMinutes = 60) => ({ start: new Date(2026, 8, 10, h, m), durationMinutes });

describe("minutesFromGridStart", () => {
  it("clamps to the visible hours", () => {
    expect(minutesFromGridStart(new Date(2026, 8, 10, 7, 0))).toBe(0);
    expect(minutesFromGridStart(new Date(2026, 8, 10, 9, 30))).toBe(150);
    expect(minutesFromGridStart(new Date(2026, 8, 10, 5, 0))).toBe(0);
    expect(minutesFromGridStart(new Date(2026, 8, 10, 23, 0))).toBe(GRID_HEIGHT_PX / PX_PER_MINUTE);
  });
});

describe("layoutEvents", () => {
  it("places non-overlapping events in a single lane", () => {
    const out = layoutEvents([at(9), at(10), at(11, 0, 30)]);
    expect(out.map((p) => [p.top, p.height, p.lane, p.lanes])).toEqual([
      [2 * HOUR_HEIGHT_PX, HOUR_HEIGHT_PX, 0, 1],
      [3 * HOUR_HEIGHT_PX, HOUR_HEIGHT_PX, 0, 1],
      [4 * HOUR_HEIGHT_PX, HOUR_HEIGHT_PX / 2, 0, 1],
    ]);
  });

  it("splits overlapping events into lanes and reuses a lane once it frees up", () => {
    const [a, b, c, d] = layoutEvents([at(9, 0, 60), at(9, 30, 60), at(10, 0, 30), at(12)]);
    expect([a.lane, a.lanes, a.group, a.groupSize]).toEqual([0, 2, 0, 3]);
    expect([b.lane, b.lanes, b.group, b.groupSize]).toEqual([1, 2, 0, 3]);
    // 10:00 começa quando a faixa 0 (9:00–10:00) já liberou: volta para a faixa 0, ainda no mesmo grupo.
    expect([c.lane, c.lanes, c.group]).toEqual([0, 2, 0]);
    // 12:00 não encosta em ninguém: grupo novo, faixa única.
    expect([d.lane, d.lanes, d.group, d.groupSize]).toEqual([0, 1, 1, 1]);
  });

  it("snaps dragged times to 15 minutes inside the grid", () => {
    expect(snapMinutes(0, 60)).toBe(0);
    expect(snapMinutes(37, 60)).toBe(30);
    expect(snapMinutes(38, 60)).toBe(45);
    expect(snapMinutes(-20, 60)).toBe(0);
    expect(snapMinutes(GRID_MINUTES, 60)).toBe(GRID_MINUTES - 60);
  });

  it("keeps very short events readable", () => {
    const [p] = layoutEvents([at(9, 0, 5)]);
    expect(p.height).toBe(MIN_BLOCK_PX);
  });

  it("sorts by start time regardless of input order", () => {
    const out = layoutEvents([at(11), at(8)]);
    expect(out.map((p) => p.item.start.getHours())).toEqual([8, 11]);
  });
});
