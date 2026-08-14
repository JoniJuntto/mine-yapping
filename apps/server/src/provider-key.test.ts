import { expect, test } from "bun:test";
import { decryptApiKey, encryptApiKey } from "./provider-key-crypto";

test("provider API keys are encrypted and authenticated", async () => {
	const encrypted = await encryptApiKey("sk-user-secret", "test-secret");
	expect(encrypted).not.toContain("sk-user-secret");
	expect(await decryptApiKey(encrypted, "test-secret")).toBe("sk-user-secret");
	expect(decryptApiKey(encrypted, "wrong-secret")).rejects.toThrow();
});
