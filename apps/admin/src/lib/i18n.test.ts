import { describe, expect, test } from "bun:test";
import { alternateLinks, getLocale, localizedUrl, translate } from "./i18n";

describe("localization", () => {
	test("selects Finnish and emits crawlable alternate URLs", () => {
		expect(getLocale("?lang=fi")).toBe("fi");
		expect(localizedUrl("/login", "fi")).toBe("/login?lang=fi");
		expect(translate("fi", "Sign in")).toBe("Kirjaudu sisään");
		expect(
			alternateLinks("/").find((link) => link.hreflang === "fi")?.href,
		).toBe("https://mine-yapper.com/?lang=fi");
	});
});
