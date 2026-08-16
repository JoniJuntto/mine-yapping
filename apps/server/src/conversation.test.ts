import { describe, expect, test } from "bun:test";
import {
	choosePersona,
	renderPrompt,
	shiftCompleteSentence,
	transcribe,
} from "./conversation";

describe("shiftCompleteSentence", () => {
	test("holds partial text and emits one complete sentence", () => {
		expect(shiftCompleteSentence("Still speaking")).toBeNull();
		expect(shiftCompleteSentence('Hello there! "Next sentence')).toEqual({
			sentence: "Hello there!",
			rest: '"Next sentence',
		});
	});
});

test("typed chat bypasses speech transcription", async () => {
	expect(await transcribe("  hello cow  ", "unused", "fi")).toBe("hello cow");
});

test("a known entity keeps its prompt and voice", () => {
	expect(
		choosePersona(
			{ promptId: "known", prompt: "Remember me", voiceId: "voice-a" },
			[{ id: "new", entityType: "minecraft:cow", prompt: "New" }],
			"minecraft:cow",
			["voice-b"],
		),
	).toEqual({
		promptId: "known",
		prompt: "Remember me",
		voiceId: "voice-a",
		shouldPersist: false,
	});
});

test("a fresh entity can pick every matching prompt", () => {
	const prompts = [
		{ id: "first", entityType: "minecraft:cow", prompt: "First" },
		{ id: "second", entityType: "minecraft:cow", prompt: "Second" },
	];
	expect(
		choosePersona(undefined, prompts, "minecraft:cow", ["v"], () => 0).promptId,
	).toBe("first");
	expect(
		choosePersona(undefined, prompts, "minecraft:cow", ["v"], () => 0.999)
			.promptId,
	).toBe("second");
});

test("the catch-all prompt applies when a type has no rows", () => {
	const persona = choosePersona(
		undefined,
		[{ id: "fallback", entityType: "*", prompt: "Fallback" }],
		"minecraft:pig",
		["voice-a"],
		() => 0,
	);
	expect(persona.promptId).toBe("fallback");
	expect(persona.prompt).toBe("Fallback");
});

test("personalities prefer user exact, user fallback, then global", () => {
	const prompts = [
		{
			id: "global-exact",
			entityType: "minecraft:cow",
			prompt: "Global cow",
			ownerUserId: null,
		},
		{
			id: "mine",
			entityType: "*",
			prompt: "My fallback",
			ownerUserId: "user-1",
		},
	];
	expect(
		choosePersona(
			undefined,
			prompts,
			"minecraft:cow",
			["voice"],
			() => 0,
			"user-1",
		).promptId,
	).toBe("mine");
	expect(
		choosePersona(
			undefined,
			prompts,
			"minecraft:cow",
			["voice"],
			() => 0,
			"user-2",
		).promptId,
	).toBe("global-exact");
});

test("prompt placeholders use mob context and erase unknown values", () => {
	expect(
		renderPrompt(
			"{entityName}/{entityType}/{playerName}/{dimension}/{health}/{missing}",
			{
				entityId: "uuid",
				entityType: "minecraft:cow",
				entityName: "Betsy",
				playerName: "Alex",
				dimension: "overworld",
				health: "10/10",
			},
		),
	).toBe("Betsy/minecraft:cow/Alex/overworld/10/10/");
});
