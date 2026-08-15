import { expect, test } from "bun:test";
import {
	estimatedApiCostUsd,
	hasRole,
	monthlyLimit,
	quotaAllowed,
} from "./rules";

test("admin checks exact roles", () => {
	expect(hasRole("admin", "admin")).toBe(true);
	expect(hasRole("user,admin", "admin")).toBe(true);
	expect(hasRole("superadmin", "admin")).toBe(false);
	expect(hasRole("user", "admin")).toBe(false);
});

test("quota stops at the plan limit", () => {
	expect(quotaAllowed(99, 100)).toBe(true);
	expect(quotaAllowed(100, 100)).toBe(false);
	expect(quotaAllowed(1_999, 2_000)).toBe(true);
	expect(quotaAllowed(2_000, 2_000)).toBe(false);
});

test("Twitch accounts get 1.5x monthly usage", () => {
	expect(monthlyLimit(100, true)).toBe(150);
	expect(monthlyLimit(101, true)).toBe(151);
	expect(monthlyLimit(100, false)).toBe(100);
});

test("API cost uses the app's current provider rates", () => {
	expect(
		estimatedApiCostUsd({
			inputTokens: 1_000_000,
			outputTokens: 1_000_000,
			ttsCharacters: 1_000,
			audioMs: 60_000,
		}),
	).toBeCloseTo(1.467);
});
