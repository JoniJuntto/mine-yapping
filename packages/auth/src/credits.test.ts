import { describe, expect, test } from "bun:test";
import { creditProducts, supporterMetadata } from "./credits";

describe("creditProducts", () => {
	test("maps configured slugs onto Polar product ids", () => {
		expect(creditProducts("credits-1000:prod_a, credits-2500:prod_b")).toEqual([
			{
				productId: "prod_a",
				pack: { slug: "credits-1000", credits: 1000, grossEur: 21.9 },
			},
			{
				productId: "prod_b",
				pack: { slug: "credits-2500", credits: 2500, grossEur: 53.9 },
			},
		]);
	});

	test("drops unknown slugs and blanks instead of throwing", () => {
		expect(creditProducts("")).toEqual([]);
		expect(creditProducts("nope:prod_a,credits-1000:")).toEqual([]);
	});

	test("ignores a product id claimed by two packs, so a grant is never ambiguous", () => {
		expect(
			creditProducts("credits-1000:prod_a,credits-2500:prod_a").map(
				({ pack }) => pack.credits,
			),
		).toEqual([1000]);
	});
});

describe("supporterMetadata", () => {
	test("only publishes a bounded nickname with explicit consent", () => {
		expect(
			supporterMetadata({ nickname: "  Alex  ", showNickname: true }),
		).toEqual({
			nickname: "Alex",
			showNickname: true,
		});
		expect(
			supporterMetadata({ nickname: "Alex", showNickname: "true" }),
		).toEqual({
			nickname: "Alex",
			showNickname: false,
		});
		expect(
			supporterMetadata({ nickname: "x".repeat(51), showNickname: true }),
		).toEqual({
			nickname: "x".repeat(50),
			showNickname: true,
		});
	});
});
