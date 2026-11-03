import { describe, it, expect } from "vitest";
import story from "../../stories/template/story.json";
import { compileStory } from "./compiler";
import { initialRuntime, type Runtime } from "../schema";
import { dispatch, advance, choose } from "../engine";
import { restoreCheckpoint, runtimeSnapshot } from "./replay";
const { work } = compileStory(story);
function send(s: Runtime, name: string, text = "随手输入的消息") {
  const anchor = work.data.kakao
    .filter((i) => i.title === name && s.unlocked.includes(i.id))
    .sort((a, b) => s.unlocked.indexOf(a.id) - s.unlocked.indexOf(b.id))
    .at(-1)?.id;
  return dispatch(
    work,
    {
      ...s,
      ui: {
        ...s.ui,
        kakao: {
          ...s.ui?.kakao,
          ["sent:" + name]: text,
          mymyKktSent: [
            ...((s.ui?.kakao?.mymyKktSent as string[]) || []),
            JSON.stringify([name, text, s.time, anchor]),
          ],
        },
      },
    },
    "variable",
    "ui:kakao:sent:" + name,
  );
}
const reply = (s: Runtime, name: string, text?: string) =>
  advance(work, send(s, name, text), 1200);
function morning() {
  let s = initialRuntime(work);
  s.variables.dayComplete = true;
  s.unlocked = ["night-goodnight"];
  s.read = ["night-goodnight"];
  s = advance(
    work,
    dispatch(work, JSON.parse(JSON.stringify(s)), "resume"),
    1800,
  );
  expect(s.date).toBe("2025-09-19");
  expect(s.time).toBe("09:10");
  return s;
}
function route(s: Runtime, r: string) {
  const name = r === "sunwoo" ? "金善旴" : "李柱延";
  s = dispatch(
    work,
    s,
    "read",
    r === "sunwoo" ? "d2-sw-morning-1" : "d2-jy-morning-2",
  );
  expect(s.variables.day2Route).toBe("");
  s = send(s, name);
  s = send(s, r === "sunwoo" ? "李柱延" : "金善旴");
  expect(s.variables.day2Route).toBe(r);
  s = advance(work, s, 1800);
  expect(s.time).toBe(r === "sunwoo" ? "10:00" : "09:50");
  s = send(s, name);
  s = send(s, name, "连发不会跳过剧情");
  s = advance(work, s, 1200);
  expect(s.variables.day2RouteDone).toBe(false);
  s = reply(s, name);
  expect(s.variables.day2RouteDone).toBe(true);
  expect(s.routeRecords?.["day2-" + r]).toBeTruthy();
  return s;
}
function common(s: Runtime, fixed: boolean, youngFirst = false) {
  s = advance(work, dispatch(work, s, "continueDay2"), 1800);
  expect(s.time).toBe("14:00");
  s = reply(s, "李贤在");
  s = reply(s, "李贤在");
  s = advance(work, s, 1800);
  expect(s.time).toBe("16:00");
  s = reply(s, "金泳勋");
  s = reply(s, "金泳勋");
  s = advance(work, s, 1800);
  expect(s.time).toBe("20:00");
  s = reply(s, "李柱延");
  expect(s.choices).toContainEqual({
    label: "是我的哥哥",
    target: "d2-brother-fixed",
  });
  s = send(s, "李柱延", "任意其他消息");
  expect(s.variables.brotherAnswerDone).not.toBe(true);
  s = fixed
    ? choose(work, s, "d2-brother-fixed")
    : send(s, "李柱延", "是我的哥哥");
  s = advance(work, s, 1200);
  expect(s.unlocked.includes("d2-owner-brother")).toBe(fixed);
  expect(s.unlocked).toContain("d2-jy-observe-2");
  s = reply(s, "李柱延");
  s = reply(s, "李柱延");
  s = advance(work, s, 1800);
  expect(s.time).toBe("23:00");
  expect(s.unlocked).toContain("d2-hj-night-1");
  expect(s.unlocked).toContain("d2-yh-night-2");
  for (let i = 0; i < 3; i++) s = reply(s, youngFirst ? "金泳勋" : "李贤在");
  expect(s.variables.day2Complete).not.toBe(true);
  for (let i = 0; i < 3; i++) s = reply(s, youngFirst ? "李贤在" : "金泳勋");
  expect(s.variables.day2Complete).toBe(true);
  const count = s.completed.filter((id) => id === "d2-arrive-afternoon").length;
  s = advance(work, dispatch(work, s, "continueDay2"), 5000);
  expect(s.completed.filter((id) => id === "d2-arrive-afternoon")).toHaveLength(
    count,
  );
  return s;
}
describe("second-day routes and checkpoint archives", () => {
  for (const first of ["sunwoo", "juyeon"])
    it(`replays ${first} then the other morning, preserving isolated read-only history`, () => {
      let s = route(morning(), first);
      const old = runtimeSnapshot(s);
      const other = first === "sunwoo" ? "juyeon" : "sunwoo";
      s = restoreCheckpoint(JSON.parse(JSON.stringify(s)), "day2-morning", {
        day2ReplayOnly: other,
      });
      expect(s.time).toBe("09:10");
      expect(s.read).toEqual(["night-goodnight"]);
      expect(s.unlocked).toContain("night-goodnight");
      expect(s.unlocked).not.toContain(
        first === "sunwoo" ? "d2-ig-wait" : "d2-sw-sold-1",
      );
      expect(s.ui?.kakao?.mymyKktSent).toBeUndefined();
      const blocked = send(s, first === "sunwoo" ? "金善旴" : "李柱延");
      expect(blocked.variables.day2Route).toBe("");
      s = route(s, other);
      expect(s.routeRecords?.["day2-" + first]?.state).toEqual(old);
      expect(Object.keys(s.routeRecords || {})).toHaveLength(2);
      expect(JSON.stringify(s.routeRecords)).not.toContain('"checkpoints"');
      expect(JSON.stringify(s.routeRecords)).not.toContain('"routeRecords"');
      s = common(
        JSON.parse(JSON.stringify(s)),
        first === "sunwoo",
        first === "juyeon",
      );
      expect(s.endings).toEqual([]);
    });
  it("continues after just one route and resumes an existing first-day save only once", () => {
    let s = route(morning(), "sunwoo");
    s = common(s, true);
    expect(Object.keys(s.routeRecords || {})).toHaveLength(1);
    const resumed = advance(
      work,
      dispatch(work, JSON.parse(JSON.stringify(s)), "resume"),
      5000,
    );
    expect(resumed.date).toBe("2025-09-19");
    expect(resumed.variables.day2Complete).toBe(true);
    expect(resumed.completed.filter((id) => id === "d2-wake")).toHaveLength(1);
  });
  it("does not restore a missing checkpoint", () => {
    const s = initialRuntime(work);
    expect(restoreCheckpoint(s, "missing")).toBe(s);
  });
});
