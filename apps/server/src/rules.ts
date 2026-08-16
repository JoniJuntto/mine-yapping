import { createHmac } from "node:crypto";

export const hasRole = (role: string | null | undefined, expected: string) =>
	role?.split(",").includes(expected) ?? false;

export type Language = "fi" | "en";

// Finnish is the product default: anything missing or unrecognised resolves to it.
export const language = (value: string | null | undefined): Language =>
	value === "en" ? "en" : "fi";

export const languageName = (value: Language) =>
	value === "fi" ? "Finnish" : "English";

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

// A credit buys one request, so a request has to have a ceiling. Without these a
// single call can cost ~7x a normal one (5 MB of audio, 120 tokens of speech) and
// no pack price survives it. Chosen well above real traffic: replies are prompted
// to two short sentences, and 20 s is a long push-to-talk.
export const MAX_TTS_CHARACTERS = 200;
export const MAX_AUDIO_MS = 20_000;
export const MAX_REPLY_TOKENS = 60;
// The mod records 24 kHz 16-bit mono (MineYappingClient.FORMAT) = 48 kB/s.
export const MAX_AUDIO_BYTES = (MAX_AUDIO_MS / 1000) * 24_000 * 2;
// Personality prompt (10 000 chars) + 4 history turns + transcript, in tokens.
const MAX_INPUT_TOKENS = 3_000;

export const worstCaseRequestUsd = estimatedApiCostUsd({
	inputTokens: MAX_INPUT_TOKENS,
	outputTokens: MAX_REPLY_TOKENS,
	ttsCharacters: MAX_TTS_CHARACTERS,
	audioMs: MAX_AUDIO_MS,
});

// ponytail: flat rate is enough while we bill in EUR and pay in USD; revisit if FX moves.
const EUR_PER_USD = 0.92;
// Finland's 25.5% is the highest VAT Polar will charge on our behalf, so it is the
// worst case. Polar is merchant of record on the Starter plan: 5% + €0.50, plus 1.5%
// for non-US cards (which is nearly every customer we have) and ~0.25% EU currency
// conversion. Drop these to 3.8% + €0.40 if we ever pay for Polar Pro.
const VAT_RATE = 0.255;
const POLAR_RATE = 0.05 + 0.015 + 0.0025;
const POLAR_FIXED_EUR = 0.5;

/** What actually lands in the bank from a VAT-inclusive sticker price. */
export const netRevenueEur = (grossEur: number) =>
	(grossEur / (1 + VAT_RATE)) * (1 - POLAR_RATE) - POLAR_FIXED_EUR;

export const worstCaseCostEur = (credits: number) =>
	credits * worstCaseRequestUsd * EUR_PER_USD;

// Pack prices satisfy netRevenueEur >= worstCaseCostEur: every pack breaks even even
// if every request in it hits the caps above. pricing.test.ts keeps that true — raise
// a cap and it fails until the prices follow.
export { CREDIT_PACKS, type CreditPack } from "@mine-yapping/auth/credits";
