import { describe, expect, test } from "bun:test";
import { extractResponseText, transcribe } from "./conversation";

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
