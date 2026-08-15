import { type FormEvent, useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";

type Personality = {
	id: string;
	entityType: string;
	label: string;
	prompt: string;
	enabled: boolean;
};

type PersonalityInput = Omit<Personality, "id">;
const entityTypes = [
	"*",
	"minecraft:allay",
	"minecraft:armadillo",
	"minecraft:armor_stand",
	"minecraft:axolotl",
	"minecraft:bat",
	"minecraft:bee",
	"minecraft:blaze",
	"minecraft:bogged",
	"minecraft:breeze",
	"minecraft:camel",
	"minecraft:camel_husk",
	"minecraft:cat",
	"minecraft:cave_spider",
	"minecraft:chicken",
	"minecraft:cod",
	"minecraft:copper_golem",
	"minecraft:cow",
	"minecraft:creaking",
	"minecraft:creeper",
	"minecraft:dolphin",
	"minecraft:donkey",
	"minecraft:drowned",
	"minecraft:elder_guardian",
	"minecraft:ender_dragon",
	"minecraft:enderman",
	"minecraft:endermite",
	"minecraft:evoker",
	"minecraft:fox",
	"minecraft:frog",
	"minecraft:ghast",
	"minecraft:giant",
	"minecraft:glow_squid",
	"minecraft:goat",
	"minecraft:guardian",
	"minecraft:happy_ghast",
	"minecraft:hoglin",
	"minecraft:horse",
	"minecraft:husk",
	"minecraft:illusioner",
	"minecraft:iron_golem",
	"minecraft:llama",
	"minecraft:magma_cube",
	"minecraft:mannequin",
	"minecraft:mooshroom",
	"minecraft:mule",
	"minecraft:nautilus",
	"minecraft:ocelot",
	"minecraft:panda",
	"minecraft:parched",
	"minecraft:parrot",
	"minecraft:phantom",
	"minecraft:pig",
	"minecraft:piglin",
	"minecraft:piglin_brute",
	"minecraft:pillager",
	"minecraft:polar_bear",
	"minecraft:pufferfish",
	"minecraft:rabbit",
	"minecraft:ravager",
	"minecraft:salmon",
	"minecraft:sheep",
	"minecraft:shulker",
	"minecraft:silverfish",
	"minecraft:skeleton",
	"minecraft:skeleton_horse",
	"minecraft:slime",
	"minecraft:sniffer",
	"minecraft:snow_golem",
	"minecraft:spider",
	"minecraft:squid",
	"minecraft:stray",
	"minecraft:strider",
	"minecraft:tadpole",
	"minecraft:trader_llama",
	"minecraft:tropical_fish",
	"minecraft:turtle",
	"minecraft:vex",
	"minecraft:villager",
	"minecraft:vindicator",
	"minecraft:wandering_trader",
	"minecraft:warden",
	"minecraft:witch",
	"minecraft:wither",
	"minecraft:wither_skeleton",
	"minecraft:wolf",
	"minecraft:zoglin",
	"minecraft:zombie",
	"minecraft:zombie_horse",
	"minecraft:zombie_nautilus",
	"minecraft:zombie_villager",
	"minecraft:zombified_piglin",
];
const emptyPersonality: PersonalityInput = {
	entityType: "*",
	label: "",
	prompt: "",
	enabled: true,
};

export function PersonalityManager({ admin = false }: { admin?: boolean }) {
	const { locale, t } = useI18n();
	const base = admin ? "/admin/personalities" : "/personalities";
	const [items, setItems] = useState<Personality[]>([]);
	const [creating, setCreating] = useState(false);
	const [editing, setEditing] = useState<string>();
	const [error, setError] = useState("");

	const load = useCallback(async () => {
		try {
			setItems(await api<Personality[]>(`${base}/`));
			setError("");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Could not load");
		}
	}, [base]);
	useEffect(() => void load(), [load]);

	async function save(
		path: string,
		method: "POST" | "PATCH",
		value: PersonalityInput | Partial<PersonalityInput>,
	) {
		try {
			await api(path, { method, body: JSON.stringify(value) });
			setCreating(false);
			setEditing(undefined);
			await load();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Could not save");
		}
	}

	async function remove(item: Personality) {
		if (
			!confirm(
				locale === "fi"
					? `Poistetaanko ”${item.label}”? Määritetyt hahmot arvotaan uudelleen.`
					: `Delete “${item.label}”? Assigned mobs will re-roll.`,
			)
		)
			return;
		await api(`${base}/${item.id}`, { method: "DELETE" });
		await load();
	}

	return (
		<section>
			<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="m-0 text-2xl">
						{admin ? t("Global personalities") : t("Your personalities")}
					</h2>
					<p className="mb-0 text-ink/60">
						{locale === "fi" ? (
							<>
								Käytä merkkiä <code>*</code> hahmotyypin varavaihtoehtona.
							</>
						) : (
							<>
								Use <code>*</code> as the fallback entity type.
							</>
						)}
					</p>
				</div>
				<button
					type="button"
					onClick={() => setCreating(true)}
					className="button-primary"
				>
					{t("New personality")}
				</button>
			</div>
			{error && (
				<p role="alert" className="alert-error">
					{error}
				</p>
			)}
			{creating && (
				<div className="card mb-5">
					<PersonalityForm
						initial={emptyPersonality}
						onCancel={() => setCreating(false)}
						onSave={(value) => save(`${base}/`, "POST", value)}
					/>
				</div>
			)}
			<div className="grid gap-4">
				{items.map((item) =>
					editing === item.id ? (
						<div key={item.id} className="card">
							<PersonalityForm
								initial={item}
								onCancel={() => setEditing(undefined)}
								onSave={(value) => save(`${base}/${item.id}`, "PATCH", value)}
							/>
						</div>
					) : (
						<article key={item.id} className="card">
							<div className="flex flex-wrap items-center justify-between gap-3">
								<div>
									<h3 className="m-0 text-lg">{item.label}</h3>
									<code className="text-ink/55 text-sm">{item.entityType}</code>
								</div>
								<div className="flex items-center gap-2">
									<label className="flex items-center gap-2 text-sm">
										<input
											type="checkbox"
											checked={item.enabled}
											onChange={(event) =>
												save(`${base}/${item.id}`, "PATCH", {
													enabled: event.target.checked,
												})
											}
										/>
										{t("Enabled")}
									</label>
									<button
										type="button"
										onClick={() => setEditing(item.id)}
										className="button-secondary"
									>
										{t("Edit")}
									</button>
									<button
										type="button"
										onClick={() => remove(item)}
										className="button-danger"
									>
										{t("Delete")}
									</button>
								</div>
							</div>
							<p className="mb-0 whitespace-pre-wrap text-ink/70 text-sm leading-6">
								{item.prompt}
							</p>
						</article>
					),
				)}
				{!items.length && !creating && !error && (
					<p className="text-ink/60">{t("No personalities yet.")}</p>
				)}
			</div>
		</section>
	);
}

function PersonalityForm({
	initial,
	onCancel,
	onSave,
}: {
	initial: PersonalityInput;
	onCancel: () => void;
	onSave: (value: PersonalityInput) => Promise<void>;
}) {
	const { t } = useI18n();
	const [pending, setPending] = useState(false);
	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setPending(true);
		const data = new FormData(event.currentTarget);
		await onSave({
			entityType: String(data.get("entityType")).trim(),
			label: String(data.get("label")).trim(),
			prompt: String(data.get("prompt")).trim(),
			enabled: data.get("enabled") === "on",
		});
		setPending(false);
	}
	return (
		<form onSubmit={submit} className="grid gap-4">
			<div className="grid gap-4 md:grid-cols-2">
				<label>
					{t("Entity type")}
					<select name="entityType" defaultValue={initial.entityType} required>
						{!entityTypes.includes(initial.entityType) && (
							<option value={initial.entityType}>{initial.entityType}</option>
						)}
						{entityTypes.map((entityType) => (
							<option key={entityType} value={entityType}>
								{entityType === "*" ? t("All entities (fallback)") : entityType}
							</option>
						))}
					</select>
				</label>
				<label>
					{t("Label")}
					<input
						name="label"
						defaultValue={initial.label}
						required
						maxLength={100}
					/>
				</label>
			</div>
			<label>
				{t("System prompt")}
				<textarea
					name="prompt"
					defaultValue={initial.prompt}
					required
					maxLength={10_000}
					rows={6}
				/>
			</label>
			<label className="flex-row">
				<input
					type="checkbox"
					name="enabled"
					defaultChecked={initial.enabled}
				/>{" "}
				{t("Enabled")}
			</label>
			<div className="flex gap-2">
				<button type="submit" disabled={pending} className="button-primary">
					{pending ? t("Saving…") : t("Save")}
				</button>
				<button type="button" onClick={onCancel} className="button-secondary">
					{t("Cancel")}
				</button>
			</div>
		</form>
	);
}
