import { db } from "@mine-yapping/db";
import { userProviderKey } from "@mine-yapping/db/schema/app";
import { env } from "@mine-yapping/env/server";
import { eq } from "drizzle-orm";
import { decryptApiKey, encryptApiKey } from "./provider-key-crypto";

export async function hasProviderKeys(userId: string) {
	const [record] = await db
		.select({ userId: userProviderKey.userId })
		.from(userProviderKey)
		.where(eq(userProviderKey.userId, userId))
		.limit(1);
	return !!record;
}

export async function getProviderKeys(userId: string) {
	const [record] = await db
		.select({
			openAi: userProviderKey.encryptedOpenAiKey,
			elevenLabs: userProviderKey.encryptedElevenLabsKey,
		})
		.from(userProviderKey)
		.where(eq(userProviderKey.userId, userId))
		.limit(1);
	return record
		? {
				openAi: await decryptApiKey(record.openAi, env.BETTER_AUTH_SECRET),
				elevenLabs: await decryptApiKey(
					record.elevenLabs,
					env.BETTER_AUTH_SECRET,
				),
			}
		: null;
}

export async function saveProviderKeys(
	userId: string,
	openAiApiKey: string,
	elevenLabsApiKey: string,
) {
	const encryptedOpenAiKey = await encryptApiKey(
		openAiApiKey.trim(),
		env.BETTER_AUTH_SECRET,
	);
	const encryptedElevenLabsKey = await encryptApiKey(
		elevenLabsApiKey.trim(),
		env.BETTER_AUTH_SECRET,
	);
	await db
		.insert(userProviderKey)
		.values({ userId, encryptedOpenAiKey, encryptedElevenLabsKey })
		.onConflictDoUpdate({
			target: userProviderKey.userId,
			set: {
				encryptedOpenAiKey,
				encryptedElevenLabsKey,
				updatedAt: new Date(),
			},
		});
}

export const deleteProviderKeys = (userId: string) =>
	db.delete(userProviderKey).where(eq(userProviderKey.userId, userId));
