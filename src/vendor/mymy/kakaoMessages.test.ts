import { describe, it, expect } from "vitest";
import { makeItem } from "../../schema";
import { kakaoMessages } from "./kakaoMessages";
const incoming = (id: string, body: string) =>
  makeItem({ id, title: "金善旴", body, sender: "金善旴" });
describe("typed KKT messages", () => {
  it("keeps typed replies before subsequent authored replies after save/restore", () => {
    const items = [
      incoming("invite", "会送你蛋糕吃的^ ^"),
      incoming("reply", "我们早就说好了哦"),
    ];
    items[1].meta.replyToTyped = "true";
    const saved = JSON.parse(
      JSON.stringify([JSON.stringify(["金善旴", "好呀🌻", "09:12", "invite"])]),
    );
    expect(
      kakaoMessages(items, saved, "金善旴", "你").map((m) => m.body),
    ).toEqual(["会送你蛋糕吃的^ ^", "好呀🌻", "我们早就说好了哦"]);
    expect(kakaoMessages(items, saved, "金善旴", "你").at(-1)?.time).toBe(
      "09:12",
    );
  });
  it("keeps rapid sends in order and separates conversations", () => {
    const sent = [
      JSON.stringify(["金善旴", "第一条", "09:00", "invite"]),
      JSON.stringify(["金善旴", "第二条", "09:00", "invite"]),
      JSON.stringify(["李贤在", "别的会话", "09:00", "other"]),
    ];
    expect(
      kakaoMessages(
        [incoming("invite", "邀请"), incoming("reply", "回复")],
        sent,
        "金善旴",
        "你",
      ).map((m) => m.body),
    ).toEqual(["邀请", "第一条", "第二条", "回复"]);
  });
  it("preserves legacy three-field saves and ignores malformed entries", () => {
    const sent = [
      "not json",
      JSON.stringify(["金善旴", 123, "09:00"]),
      JSON.stringify(["金善旴", "旧消息", "09:00"]),
    ];
    expect(
      kakaoMessages([incoming("invite", "邀请")], sent, "金善旴", "你").map(
        (m) => m.body,
      ),
    ).toEqual(["邀请", "旧消息"]);
  });
});
