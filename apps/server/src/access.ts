import { createHash } from "node:crypto";
import { auth } from "@mine-yapping/auth";
import { db } from "@mine-yapping/db";
import { user } from "@mine-yapping/db/schema/auth";
import { eq } from "drizzle-orm";

export { hasRole } from "./rules";

export const getSession = (request: Request) =>
	auth.api.getSession({ headers: request.headers });

const apiKeyUsers = new Map<
	string,
	{ expiresAt: number; value: Awaited<ReturnType<typeof findApiKeyUser>> }
>();

export const invalidateApiKeyUsers = () => apiKeyUsers.clear();

async function findApiKeyUser(key: string) {
	const verified = await auth.api.verifyApiKey({ body: { key } });
	if (!verified.valid || !verified.key)
		return { error: "Invalid or revoked Minecraft API key" } as const;

	const [record] = await db
		.select()
		.from(user)
		.where(eq(user.id, verified.key.referenceId))
		.limit(1);
	if (!record) return { error: "API key owner not found" } as const;
	if (!record.emailVerified)
		return { error: "Verify your email before using free credits" } as const;
	if (record.banned) {
		if (!record.banExpires || record.banExpires > new Date()) {
			return { error: "Account is banned", forbidden: true } as const;
		}
		await db
			.update(user)
			.set({ banned: false, banReason: null, banExpires: null })
			.where(eq(user.id, record.id));
	}
	return { user: record } as const;
}

export async function getApiKeyUser(request: Request) {
	const key = request.headers.get("x-api-key");
	if (!key) return { error: "Minecraft API key required" } as const;
	const hash = createHash("sha256").update(key).digest("base64url");
	const cached = apiKeyUsers.get(hash);
	if (cached && cached.expiresAt > Date.now()) return cached.value;
	const value = await findApiKeyUser(key);
	if ("user" in value) {
		apiKeyUsers.set(hash, { expiresAt: Date.now() + 60_000, value });
		if (apiKeyUsers.size > 1_000)
			apiKeyUsers.delete(apiKeyUsers.keys().next().value as string);
	}
	return value;
}
