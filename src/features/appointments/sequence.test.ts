import { describe, expect, it } from "vitest";
import { countMeetings, countMeetingsDone, meetingLabel, meetingNumber, meetingOrder, meetingOrdinal, type MeetingItem } from "./sequence";

const at = (day: number) => new Date(2026, 7, day, 10, 0).toISOString();
const make = (over: Partial<MeetingItem> & { id: string }): MeetingItem => ({ kind: "visita", status: "realizado", scheduledAt: at(1), ...over });

describe("meetingNumber", () => {
  it("numbers visits and online meetings in the order they were scheduled", () => {
    const all = [
      make({ id: "c", scheduledAt: at(20) }),
      make({ id: "a", scheduledAt: at(3) }),
      make({ id: "b", kind: "reuniao", scheduledAt: at(10) }),
    ];
    expect(meetingNumber(all, "a")).toBe(1);
    expect(meetingNumber(all, "b")).toBe(2);
    expect(meetingNumber(all, "c")).toBe(3);
  });

  it("does not number a call or a follow-up — they are contacts, not meetings", () => {
    const all = [make({ id: "visita" }), make({ id: "lig", kind: "ligacao" }), make({ id: "ret", kind: "retorno" })];
    expect(meetingNumber(all, "lig")).toBeNull();
    expect(meetingNumber(all, "ret")).toBeNull();
    expect(meetingNumber(all, "visita")).toBe(1);
  });

  it("frees the number again when a meeting is cancelled", () => {
    const all = [make({ id: "a", scheduledAt: at(3) }), make({ id: "b", scheduledAt: at(5), status: "cancelado" }), make({ id: "c", scheduledAt: at(9), status: "agendado" })];
    expect(meetingNumber(all, "b")).toBeNull();
    expect(meetingNumber(all, "c")).toBe(2);
  });

  it("keeps counting a no-show — the attempt did happen", () => {
    const all = [make({ id: "a", scheduledAt: at(3), status: "faltou" }), make({ id: "b", scheduledAt: at(9), status: "agendado" })];
    expect(meetingNumber(all, "b")).toBe(2);
  });

  it("returns null for an appointment that is not in the list", () => {
    expect(meetingNumber([make({ id: "a" })], "outro")).toBeNull();
  });

  it("breaks ties by id so the order never flickers between renders", () => {
    const all = [make({ id: "z", scheduledAt: at(4) }), make({ id: "a", scheduledAt: at(4) })];
    expect(meetingOrder(all).map((a) => a.id)).toEqual(["a", "z"]);
  });
});

describe("counts", () => {
  const all = [
    make({ id: "1", status: "realizado" }),
    make({ id: "2", status: "faltou" }),
    make({ id: "3", status: "agendado" }),
    make({ id: "4", status: "cancelado" }),
    make({ id: "5", kind: "ligacao", status: "realizado" }),
  ];

  it("counts meetings that still stand, and separately the ones already done", () => {
    expect(countMeetings(all)).toBe(3);
    expect(countMeetingsDone(all)).toBe(1);
  });
});

describe("labels", () => {
  it("writes the ordinal in Portuguese, short for the card and long for the tooltip", () => {
    expect(meetingOrdinal(3)).toBe("3ª");
    expect(meetingLabel(1, "visita")).toBe("1ª visita à loja");
    expect(meetingLabel(2, "reuniao")).toBe("2ª reunião online");
  });
});
