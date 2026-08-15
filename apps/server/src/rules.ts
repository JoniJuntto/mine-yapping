import { createHmac } from "node:crypto";

export const hasRole = (role: string | null | undefined, expected: string) =>
	role?.split(",").includes(expected) ?? false;

export const quotaAllowed = (requests: number, limit: number) =>
	requests < limit;

export const monthlyLimit = (baseLimit: number, hasTwitch: boolean) =>
	hasTwitch ? Math.floor(baseLimit * 1.5) : baseLimit;

export function quotaKey(
	forwardedFor: string | null,
	secret: string,
	userId: string,
) {
	const ip = forwardedFor?.split(",").at(-1)?.trim();
	return ip
		? createHmac("sha256", secret).update(ip).digest("base64url")
		: `user:${userId}`;
}

// Direct provider prices as of 2026-08-15.
const USD_PER_INPUT_TOKEN = 0.2 / 1_000_000;
const USD_PER_OUTPUT_TOKEN = 1.2 / 1_000_000;
const USD_PER_TTS_CHARACTER = 0.05 / 1_000;
const USD_PER_TRANSCRIPTION_MS = 0.017 / 60_000;

export const estimatedApiCostUsd = (usage: {
	inputTokens: number;
	outputTokens: number;
	ttsCharacters: number;
	audioMs: number;
}) =>
	usage.inputTokens * USD_PER_INPUT_TOKEN +
	usage.outputTokens * USD_PER_OUTPUT_TOKEN +
	usage.ttsCharacters * USD_PER_TTS_CHARACTER +
	usage.audioMs * USD_PER_TRANSCRIPTION_MS;
