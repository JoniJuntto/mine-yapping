import { db } from "@mine-yapping/db";
import { mobPersona, mobPrompt } from "@mine-yapping/db/schema/prompts";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { getSession, hasRole } from "./access";

const promptFields = {
	entityType: t.String({ minLength: 1, maxLength: 100 }),
	label: t.String({ minLength: 1, maxLength: 100 }),
	prompt: t.String({ minLength: 1, maxLength: 10_000 }),
	enabled: t.Boolean(),
};

const owner = (userId: string | null) =>
	userId ? eq(mobPrompt.ownerUserId, userId) : isNull(mobPrompt.ownerUserId);

function personalities(admin: boolean) {
	const prefix = admin ? "/api/admin/personalities" : "/api/personalities";
	return new Elysia({ prefix })
		.resolve(async ({ request, status }) => {
			const session = await getSession(request);
			if (!session) return status(401, "Unauthorized");
			if (admin && !hasRole(session.user.role, "admin"))
				return status(403, "Forbidden");
			return { currentUser: session.user };
		})
		.get("/", ({ currentUser }) =>
			db
				.select()
				.from(mobPrompt)
				.where(owner(admin ? null : currentUser.id))
				.orderBy(mobPrompt.entityType, desc(mobPrompt.createdAt)),
		)
		.post(
			"/",
			async ({ body, currentUser, status }) => {
				const [prompt] = await db
					.insert(mobPrompt)
					.values({ ...body, ownerUserId: admin ? null : currentUser.id })
					.returning();
				return status(201, prompt);
			},
			{
				body: t.Object({
					entityType: promptFields.entityType,
					label: promptFields.label,
					prompt: promptFields.prompt,
					enabled: t.Optional(promptFields.enabled),
				}),
			},
		)
		.patch(
			"/:id",
			async ({ body, currentUser, params, status }) => {
				const [prompt] = await db
					.update(mobPrompt)
					.set({ ...body, updatedAt: new Date() })
					.where(
						and(
							eq(mobPrompt.id, params.id),
							owner(admin ? null : currentUser.id),
						),
					)
					.returning();
				return prompt ?? status(404, "Personality not found");
			},
			{
				params: t.Object({ id: t.String({ format: "uuid" }) }),
				body: t.Partial(t.Object(promptFields)),
			},
		)
		.delete(
			"/:id",
			async ({ currentUser, params, status }) => {
				const [deleted] = await db
					.delete(mobPrompt)
					.where(
						and(
							eq(mobPrompt.id, params.id),
							owner(admin ? null : currentUser.id),
						),
					)
					.returning({ id: mobPrompt.id });
				return deleted ? status(204) : status(404, "Personality not found");
			},
			{ params: t.Object({ id: t.String({ format: "uuid" }) }) },
		);
}

export const promptsApi = new Elysia()
	.use(personalities(false))
	.use(personalities(true))
	.delete(
		"/api/personas/:entityId",
		async ({ params, request, status }) => {
			const session = await getSession(request);
			if (!session) return status(401, "Unauthorized");
			const [deleted] = await db
				.delete(mobPersona)
				.where(
					and(
						eq(mobPersona.userId, session.user.id),
						eq(mobPersona.entityId, params.entityId),
					),
				)
				.returning({ entityId: mobPersona.entityId });
			return deleted ? status(204) : status(404, "Persona not found");
		},
		{
			params: t.Object({
				entityId: t.String({ minLength: 1, maxLength: 100 }),
			}),
		},
	);
