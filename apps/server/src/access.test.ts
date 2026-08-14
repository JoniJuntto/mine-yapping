import { expect, test } from "bun:test";
import { hasRole, quotaAllowed } from "./rules";

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
