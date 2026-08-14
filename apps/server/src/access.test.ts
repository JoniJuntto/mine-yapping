import { expect, test } from "bun:test";
import { hasRole, quotaAllowed } from "./rules";

test("admin checks exact roles", () => {
	expect(hasRole("admin", "admin")).toBe(true);
	expect(hasRole("user,admin", "admin")).toBe(true);
	expect(hasRole("superadmin", "admin")).toBe(false);
	expect(hasRole("user", "admin")).toBe(false);
});

test("free quota stops at the limit while subscriptions bypass it", () => {
	expect(quotaAllowed(99, 100, false)).toBe(true);
	expect(quotaAllowed(100, 100, false)).toBe(false);
	expect(quotaAllowed(100, 100, true)).toBe(true);
});
