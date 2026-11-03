import story from "../../stories/template/story.json";
import { describe, it, expect } from "vitest";
import { compileStory } from "./compiler";
import { dispatch, advance, choose, visible } from "../engine";
import { initialRuntime, type Runtime } from "../schema";
const { work } = compileStory(story);
const start = () => dispatch(work, initialRuntime(work), "start");
function interact(s: Runtime, key: string, value: string[]) {
  return dispatch(
    work,
    { ...s, ui: { ...s.ui, instagram: { ...s.ui?.instagram, [key]: value } } },
    "variable",
    "ui:instagram:" + key,
  );
}
describe("flower shop cross-App story", () => {
  for (const [key, value] of [
    ["mymyLiked", ["ig-opening"]],
    ["mymyReplies", ["ig-opening\t🌻 今天也加油"]],
  ] as const) {
    for (const order of [
      ["come", "later", "silent"],
      ["come", "silent", "later"],
      ["later", "come", "silent"],
      ["later", "silent", "come"],
      ["silent", "come", "later"],
      ["silent", "later", "come"],
    ]) {
      it(`${key} supports sequential replies ${order.join(" → ")} and save/restore`, () => {
        let s = start();
        expect(s.choices).toHaveLength(0);
        expect(work.data.kakao.filter((i) => visible(i, s))).toHaveLength(0);
        s = interact(s, key, [...value]);
        expect(s.unlocked).toEqual(["kkt-special"]);
        s = advance(work, s, 800);
        expect(s.unlocked).toContain("kkt-bouquet");
        expect(s.unlocked).not.toContain("kkt-welcome");
        s = advance(work, s, 800);
        s = dispatch(work, s, "read", "kkt-welcome");
        expect(s.choices).toHaveLength(3);
        for (const [index, branch] of order.entries()) {
          s = choose(work, s, "reply-" + branch);
          expect(s.choices).toHaveLength(0);
          s = JSON.parse(JSON.stringify(s));
          s = advance(work, s, 1200);
          expect(s.unlocked).toContain("juyeon-" + branch);
          expect(s.choices).toHaveLength(2 - index);
          expect(s.choices.some((c) => c.target === "reply-" + branch)).toBe(
            false,
          );
          expect(choose(work, s, "reply-" + branch)).toEqual(s);
          expect(s.endings).toHaveLength(0);
        }
        const messages = work.data.kakao.filter((i) => visible(i, s));
        expect(messages.filter((i) => i.outgoing)).toHaveLength(2);
        expect(messages.some((i) => i.body === "已读不回")).toBe(false);
        expect(s.unlocked.filter((id) => id.startsWith("juyeon-"))).toEqual(
          order.map((k) => "juyeon-" + k),
        );
      });
    }
  }

  it("viewing or opening comments does not invite; like, unlike and comments share one invitation", () => {
    let s = dispatch(work, start(), "read", "ig-opening");
    expect(s.unlocked).toHaveLength(0);
    s = interact(s, "mymyLiked", ["ig-opening"]);
    s = interact(s, "mymyLiked", []);
    s = interact(s, "mymyReplies", ["ig-opening\t你好"]);
    s = advance(work, s, 5000);
    expect(s.completed.filter((id) => id === "invite")).toHaveLength(1);
    expect(
      s.notifications.filter((n) => n.startsWith("KakaoTalk：")),
    ).toHaveLength(1);
    expect(s.unlocked).toEqual(["kkt-special", "kkt-bouquet", "kkt-welcome"]);
  });
});

describe("three new contacts", () => {
  const prepare = () => {
    let s = interact(start(), "mymyLiked", ["ig-opening"]);
    s = advance(work, s, 1600);
    s = dispatch(work, s, "read", "kkt-welcome");
    return s;
  };
  for (const branch of ["come", "later", "silent"]) {
    it(`publishes in order after ${branch}; opening INS triggers invitations exactly once`, () => {
      let s = prepare();
      s = dispatch(work, s, "openApp", "instagram");
      expect(s.unlocked).not.toContain("kkt-sunwoo-1");
      s = choose(work, s, "reply-" + branch);
      expect(s.unlocked).toContain("ig-sunwoo");
      expect(s.unlocked).not.toContain("ig-hyunjae");
      s = advance(work, s, 600);
      expect(s.unlocked).toContain("ig-hyunjae");
      expect(s.unlocked).not.toContain("ig-younghoon");
      s = advance(work, s, 600);
      expect(s.unlocked).toContain("ig-younghoon");
      s = dispatch(work, s, "openApp", "instagram");
      for (const id of ["sunwoo", "hyunjae", "younghoon"])
        expect(s.unlocked).toContain("kkt-" + id + "-1");
      const notices = s.notifications.length;
      s = dispatch(work, s, "openApp", "instagram");
      expect(s.notifications).toHaveLength(notices);
      expect(s.unlocked.filter((i) => i.startsWith("ig-"))).toEqual([
        "ig-sunwoo",
        "ig-hyunjae",
        "ig-younghoon",
      ]);
    });
  }
  for (const [id, name] of [
    ["sunwoo", "金善旴"],
    ["hyunjae", "李贤在"],
    ["younghoon", "金泳勋"],
  ]) {
    it(`routes arbitrary typed messages only to ${name}, with one reply and save restore`, () => {
      let s = prepare();
      s = dispatch(work, s, "variable", "ui:kakao:sent:" + name);
      expect(s.completed).not.toContain("typed-" + id);
      s = choose(work, s, "reply-come");
      s = advance(work, s, 1200);
      s = dispatch(work, s, "openApp", "instagram");
      s = dispatch(
        work,
        { ...s, ui: { ...s.ui, kakao: { ["sent:" + name]: "任意内容🌻" } } },
        "variable",
        "ui:kakao:sent:" + name,
      );
      expect(s.unlocked).not.toContain("kkt-" + id + "-reply");
      s = advance(work, JSON.parse(JSON.stringify(s)), 1200);
      expect(s.unlocked.filter((k) => /^kkt-.*-reply$/.test(k))).toEqual([
        "kkt-" + id + "-reply",
      ]);
      const unlocked = s.unlocked.length;
      s = advance(
        work,
        dispatch(work, s, "variable", "ui:kakao:sent:" + name),
        1200,
      );
      expect(s.unlocked).toHaveLength(unlocked);
    });
  }
});

describe("one-day itinerary", () => {
  function send(s: Runtime, name: string, value = "任意回复^ ^") {
    return dispatch(
      work,
      {
        ...s,
        ui: { ...s.ui, kakao: { ...s.ui?.kakao, ["sent:" + name]: value } },
      },
      "variable",
      "ui:kakao:sent:" + name,
    );
  }
  function morning(branch: string) {
    let s = interact(start(), "mymyLiked", ["ig-opening"]);
    s = advance(work, s, 1600);
    s = dispatch(work, s, "read", "kkt-welcome");
    s = choose(work, s, "reply-" + branch);
    s = advance(work, s, 1200);
    s = dispatch(work, s, "openApp", "instagram");
    for (const name of ["金善旴", "李贤在", "金泳勋"])
      s = advance(work, send(s, name), 1200);
    return s;
  }
  for (const branch of ["come", "later", "silent"]) {
    it(`takes ${branch} through 10:00, 10:10, 14:00 and 23:00, with a typed goodnight`, () => {
      let s = morning(branch);
      expect(s.unlocked).not.toContain("day-sunwoo-1");
      s = advance(work, s, 1800);
      expect(s.time).toBe("10:00");
      expect(s.unlocked).toContain("day-sunwoo-2");
      s = advance(work, send(s, "金善旴"), 1200);
      expect(s.unlocked).toContain("ig-sunwoo-exchange");
      s = advance(work, s, 1800);
      expect(s.time).toBe("10:10");
      expect(s.unlocked).toContain("day-juyeon-4");
      s = advance(work, send(s, "李柱延"), 1200);
      expect(s.unlocked).toContain("day-juyeon-reply");
      s = advance(work, s, 1800);
      expect(s.time).toBe("14:00");
      s = send(s, "李贤在");
      s = send(s, "李贤在", "连发第二条");
      s = advance(work, s, 1200);
      expect(s.unlocked).toContain("lunch-photo");
      expect(s.unlocked).not.toContain("lunch-home");
      s = advance(work, send(JSON.parse(JSON.stringify(s)), "李贤在"), 1200);
      expect(s.unlocked).toContain("lunch-come");
      s = advance(work, send(s, "李贤在"), 1200);
      expect(s.unlocked).toContain("lunch-obey");
      s = advance(work, s, 1800);
      expect(s.time).toBe("23:00");
      s = advance(work, send(s, "金泳勋"), 1200);
      expect(s.unlocked).toContain("night-okay");
      expect(s.unlocked).not.toContain("night-photo");
      s = advance(work, send(s, "金泳勋"), 1200);
      expect(s.unlocked).toContain("night-photo");
      expect(s.unlocked).toContain("night-goodnight");
      expect(s.variables.dayComplete).not.toBe(true);
      s = send(s, "金泳勋", "明天见");
      expect(s.variables.dayComplete).not.toBe(true);
      s = send(s, "金泳勋", "晚安");
      expect(s.variables.dayComplete).toBe(true);
      expect(s.endings).toEqual([]);
    });
  }
  it("ignores replies to the wrong contact and keeps later messages hidden", () => {
    let s = advance(work, morning("come"), 1800);
    const ids = [...s.unlocked];
    s = advance(work, send(s, "李贤在"), 5000);
    expect(s.unlocked).toEqual(ids);
    expect(s.time).toBe("10:00");
    expect(s.unlocked).not.toContain("lunch-photo");
    expect(s.unlocked).not.toContain("night-photo");
  });
});
