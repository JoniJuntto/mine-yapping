import { describe, expect, test } from "bun:test";
import { extractResponseText } from "./conversation";

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
