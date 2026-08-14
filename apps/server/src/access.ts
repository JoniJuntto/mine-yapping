import { auth } from "@mine-yapping/auth";
import { db } from "@mine-yapping/db";
import { user } from "@mine-yapping/db/schema/auth";
import { eq } from "drizzle-orm";

export { hasRole } from "./rules";

export const getSession = (request: Request) =>
	auth.api.getSession({ headers: request.headers });

export async function getApiKeyUser(request: Request) {
	const key = request.headers.get("x-api-key");
	if (!key) return { error: "Minecraft API key required" } as const;
	const verified = await auth.api.verifyApiKey({ body: { key } });
	if (!verified.valid || !verified.key)
		return { error: "Invalid or revoked Minecraft API key" } as const;

	const [record] = await db
		.select()
		.from(user)
		.where(eq(user.id, verified.key.referenceId))
		.limit(1);
	if (!record) return { error: "API key owner not found" } as const;
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
