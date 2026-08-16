import { describe, expect, test } from "bun:test";
import {
	CREDIT_PACKS,
	netRevenueEur,
	worstCaseCostEur,
	worstCaseRequestUsd,
} from "./rules";

describe("credit pack pricing", () => {
	// The whole point of the caps in rules.ts: a request has a known ceiling.
	test("a capped request costs about 1.6 US cents", () => {
		expect(worstCaseRequestUsd).toBeCloseTo(0.0163, 4);
	});

	for (const { slug, credits, grossEur } of CREDIT_PACKS)
		test(`${slug} breaks even when every request hits the caps`, () => {
			expect(netRevenueEur(grossEur)).toBeGreaterThanOrEqual(
				worstCaseCostEur(credits),
			);
		});

	test("bigger packs never cost more per request", () => {
		const perRequest = CREDIT_PACKS.map(
			({ credits, grossEur }) => grossEur / credits,
		);
		expect(perRequest).toEqual([...perRequest].sort((a, b) => b - a));
	});

	test("VAT and Polar fees take roughly a quarter of the sticker price", () => {
		expect(netRevenueEur(20.9)).toBeCloseTo(15.59, 2);
	});
});
