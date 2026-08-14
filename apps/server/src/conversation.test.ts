import { describe, expect, test } from "bun:test";
import { extractResponseText, transcribe, voiceFor } from "./conversation";

describe("extractResponseText", () => {
	test("finds structured output text", () => {
		expect(
			extractResponseText({
				output: [
					{ content: [{ type: "output_text", text: '{"reply":"hmm"}' }] },
				],
			}),
		).toBe('{"reply":"hmm"}');
	});

	test("rejects an empty response", () => {
		expect(() => extractResponseText({ output: [] })).toThrow(
			"OpenAI returned no text",
		);
	});
});

test("typed chat bypasses speech transcription", async () => {
	expect(await transcribe("  hello cow  ", "unused")).toBe("hello cow");
});

test("an entity keeps its first randomly assigned voice", () => {
	const entityId = crypto.randomUUID();
	const voice = voiceFor(entityId, ["voice-a", "voice-b"]);
	expect(["voice-a", "voice-b"]).toContain(voice);
	expect(voiceFor(entityId, ["different-voice"])).toBe(voice);
});
