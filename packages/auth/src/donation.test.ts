import { describe, expect, test } from "bun:test";
import { donorMetadata } from "./donation";

describe("donorMetadata", () => {
	test("only publishes a bounded nickname with explicit consent", () => {
		expect(donorMetadata({ nickname: "  Alex  ", showNickname: true })).toEqual(
			{
				nickname: "Alex",
				showNickname: true,
			},
		);
		expect(donorMetadata({ nickname: "Alex", showNickname: "true" })).toEqual({
			nickname: "Alex",
			showNickname: false,
		});
		expect(
			donorMetadata({ nickname: "x".repeat(51), showNickname: true }),
		).toEqual({ nickname: "x".repeat(50), showNickname: true });
	});
});
