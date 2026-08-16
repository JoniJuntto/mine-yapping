import { expect, test } from "bun:test";
import {
	estimatedApiCostUsd,
	hasRole,
	language,
	languageName,
	monthlyLimit,
	quotaAllowed,
	quotaKey,
} from "./rules";

test("admin checks exact roles", () => {
	expect(hasRole("admin", "admin")).toBe(true);
	expect(hasRole("user,admin", "admin")).toBe(true);
	expect(hasRole("superadmin", "admin")).toBe(false);
	expect(hasRole("user", "admin")).toBe(false);
});

test("language falls back to Finnish unless English is explicitly stored", () => {
	expect(language("en")).toBe("en");
	expect(language("fi")).toBe("fi");
	expect(language(null)).toBe("fi");
	expect(language(undefined)).toBe("fi");
	expect(language("sv")).toBe("fi");
	expect(languageName(language(null))).toBe("Finnish");
	expect(languageName(language("en"))).toBe("English");
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

test("quota identity uses the proxy-observed IP without storing it", () => {
	const first = quotaKey("spoofed, 203.0.113.4", "secret", "user-1");
	expect(first).toBe(quotaKey("203.0.113.4", "secret", "user-2"));
	expect(first).not.toContain("203.0.113.4");
	expect(quotaKey(null, "secret", "user-1")).toBe("user:user-1");
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
