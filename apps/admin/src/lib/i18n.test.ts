import { describe, expect, test } from "bun:test";
import { alternateLinks, getLocale, localizedUrl, translate } from "./i18n";

describe("localization", () => {
	test("defaults to Finnish and treats English as the opt-in", () => {
		expect(getLocale(undefined)).toBe("fi");
		expect(getLocale("")).toBe("fi");
		expect(getLocale("?lang=en")).toBe("en");
		expect(getLocale({ lang: "en" })).toBe("en");
		expect(getLocale("?lang=sv")).toBe("fi");
		expect(localizedUrl("/login", "fi")).toBe("/login");
		expect(localizedUrl("/login", "en")).toBe("/login?lang=en");
		expect(translate("fi", "Sign in")).toBe("Kirjaudu sisään");
		expect(translate("en", "Sign in")).toBe("Sign in");
	});

	test("emits crawlable alternates with Finnish as canonical", () => {
		const links = alternateLinks("/");
		expect(links.find((link) => link.rel === "canonical")?.href).toBe(
			"https://mine-yapper.com/",
		);
		expect(links.find((link) => link.hreflang === "fi")?.href).toBe(
			"https://mine-yapper.com/",
		);
		expect(links.find((link) => link.hreflang === "en")?.href).toBe(
			"https://mine-yapper.com/?lang=en",
		);
		expect(links.find((link) => link.hreflang === "x-default")?.href).toBe(
			"https://mine-yapper.com/",
		);
	});
});
