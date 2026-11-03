import { describe, it, expect } from "vitest";
import { makeItem } from "../../schema";
import { newestPosts, unreadMessages } from "./presentation";
const post = (id: string, time: string) => makeItem({ id, title: id, time });
describe("Instagram publication order", () => {
  it("puts later times first without mutating input", () => {
    const items = [
      post("old", "2025-09-18 09:00"),
      post("new", "2025-09-18 10:00"),
      post("middle", "2025-09-18 09:30"),
    ];
    expect(newestPosts(items).map((i) => i.id)).toEqual([
      "new",
      "middle",
      "old",
    ]);
    expect(items[0].id).toBe("old");
  });
  it("uses actual reveal order for posts published within the same minute", () => {
    const items = ["original", "sunwoo", "hyunjae", "younghoon"].map((id) =>
      post(id, "2025-09-18 09:00"),
    );
    expect(
      newestPosts(items, ["sunwoo", "hyunjae", "younghoon"]).map((i) => i.id),
    ).toEqual(["younghoon", "hyunjae", "sunwoo", "original"]);
  });
  it("keeps ordering deterministic after restoring a save", () => {
    const items = [
      post("a", "2025-09-18 09:00"),
      post("b", "2025-09-18 09:00"),
    ];
    expect(
      newestPosts(items, JSON.parse(JSON.stringify(["b", "a"]))).map(
        (i) => i.id,
      ),
    ).toEqual(["a", "b"]);
  });
});
describe("KKT unread counts", () => {
  it("counts incoming texts and images, excluding sent and previously read messages", () => {
    const items = [
      makeItem({ id: "incoming" }),
      makeItem({ id: "picture", kind: "image" }),
      makeItem({ id: "outgoing", outgoing: true }),
      makeItem({ id: "already-read", read: true }),
      makeItem({ id: "read-in-save" }),
    ];
    expect(unreadMessages(items, ["read-in-save"])).toBe(2);
    expect(unreadMessages(items, ["read-in-save", "incoming", "picture"])).toBe(
      0,
    );
  });
  it("adds newly arrived messages without reviving old unread counts", () => {
    const items = [makeItem({ id: "old" }), makeItem({ id: "new" })];
    const read = JSON.parse(JSON.stringify(["old"]));
    expect(unreadMessages(items, read)).toBe(1);
  });
});
