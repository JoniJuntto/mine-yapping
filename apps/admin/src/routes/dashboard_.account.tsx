import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { AppShell } from "../components/app-shell";
import { DonationForm } from "../components/donation-form";
import { api } from "../lib/api";
import { authClient } from "../lib/auth-client";
import { useI18n } from "../lib/i18n";
import { requireUser } from "../lib/route-guards";

type Key = {
	id: string;
	name: string | null;
	start: string | null;
	createdAt: Date;
};
type Summary = {
	user: { name: string; email: string };
	donationsEnabled: boolean;
	byokConfigured: boolean;
};

export const Route = createFileRoute("/dashboard_/account")({
	beforeLoad: () => requireUser(),
	component: Account,
});

function Account() {
	const { t } = useI18n();
	const [summary, setSummary] = useState<Summary>();
	const [keys, setKeys] = useState<Key[]>([]);
	const [newKey, setNewKey] = useState("");
	const [error, setError] = useState("");
	const [byokMessage, setByokMessage] = useState("");
	const loadKeys = useCallback(async () => {
		const result = await authClient.apiKey.list();
		if (result.error) throw new Error(result.error.message);
		setKeys(result.data?.apiKeys ?? []);
	}, []);
	useEffect(() => {
		api<Summary>("/me/summary")
			.then(setSummary)
			.catch((cause) => setError(cause.message));
		loadKeys().catch((cause) => setError(cause.message));
	}, [loadKeys]);

	async function updateProfile(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		const result = await authClient.updateUser({
			name: String(data.get("name")).trim(),
		});
		if (result.error)
			setError(result.error.message ?? "Could not update profile");
		else
			setSummary((value) =>
				value
					? {
							...value,
							user: { ...value.user, name: String(data.get("name")).trim() },
						}
					: value,
			);
	}

	async function createKey() {
		const result = await authClient.apiKey.create({ name: "Minecraft" });
		if (result.error)
			return setError(result.error.message ?? "Could not create key");
		setNewKey(result.data?.key ?? "");
		await loadKeys();
	}

	async function saveByokKey(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		try {
			const data = new FormData(event.currentTarget);
			await api("/me/provider-keys", {
				method: "PUT",
				body: JSON.stringify({
					openAiApiKey: data.get("openAiApiKey"),
					elevenLabsApiKey: data.get("elevenLabsApiKey"),
				}),
			});
			event.currentTarget.reset();
			setSummary((value) =>
				value ? { ...value, byokConfigured: true } : value,
			);
			setByokMessage(t("Provider keys saved."));
			setError("");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Could not save key");
		}
	}

	return (
		<AppShell>
			<p className="eyebrow">{t("Account")}</p>
			<h1 className="mt-0 text-4xl">{t("Profile and connection")}</h1>
			{error && (
				<p role="alert" className="alert-error">
					{error}
				</p>
			)}
			<div className="grid gap-6 lg:grid-cols-2">
				<section className="card">
					<h2>{t("Profile")}</h2>
					<form onSubmit={updateProfile} className="grid gap-4">
						<label>
							{t("Name")}
							<input
								name="name"
								defaultValue={summary?.user.name}
								required
								maxLength={100}
							/>
						</label>
						<label>
							{t("Email")}
							<input value={summary?.user.email ?? ""} disabled />
						</label>
						<button className="button-primary" type="submit">
							{t("Save profile")}
						</button>
					</form>
				</section>
				<section className="card">
					<h2>{t("Support Mine Yapping")}</h2>
					<p>
						{t(
							"Donations are optional and never change features or usage limits.",
						)}
					</p>
					{summary?.donationsEnabled && (
						<DonationForm defaultNickname={summary.user.name} />
					)}
				</section>
				<section className="card lg:col-span-2">
					<h2>{t("Bring your own provider keys")}</h2>
					<p>
						{t(
							"Use your own OpenAI and ElevenLabs accounts instead of the monthly free allowance.",
						)}
					</p>
					<form onSubmit={saveByokKey} className="grid gap-4">
						<label>
							OpenAI API key
							<input
								type="password"
								name="openAiApiKey"
								autoComplete="off"
								maxLength={512}
								required
							/>
							<small>
								{t("The key is encrypted and is never shown again.")}
							</small>
						</label>
						<label>
							ElevenLabs API key
							<input
								type="password"
								name="elevenLabsApiKey"
								autoComplete="off"
								maxLength={512}
								required
							/>
							<small>
								{t("The key is encrypted and is never shown again.")}
							</small>
						</label>
						<div className="flex flex-wrap gap-2">
							<button type="submit" className="button-primary">
								{summary?.byokConfigured ? t("Replace key") : t("Save key")}
							</button>
							{summary?.byokConfigured && (
								<button
									type="button"
									className="button-danger"
									onClick={async () => {
										try {
											await api("/me/provider-keys", {
												method: "DELETE",
											});
											setSummary((value) =>
												value ? { ...value, byokConfigured: false } : value,
											);
											setByokMessage(t("Using the free tier."));
											setError("");
										} catch (cause) {
											setError(
												cause instanceof Error
													? cause.message
													: "Could not remove key",
											);
										}
									}}
								>
									{t("Remove key")}
								</button>
							)}
						</div>
					</form>
					{byokMessage && (
						<p role="status" className="mb-0 text-sm">
							{byokMessage}
						</p>
					)}
				</section>
				<section className="card lg:col-span-2">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h2 className="mb-1">{t("Minecraft API keys")}</h2>
							<p className="m-0 text-ink/60">
								{t("Join a world and run")} <code>/login &lt;token&gt;</code>.
							</p>
						</div>
						<button
							type="button"
							className="button-primary"
							onClick={createKey}
						>
							{t("Create key")}
						</button>
					</div>
					{newKey && (
						<div className="my-5 rounded-xl bg-lime-100 p-4">
							<strong>{t("Copy this now. It will not be shown again.")}</strong>
							<code className="mt-2 block select-all break-all">{newKey}</code>
						</div>
					)}
					<div className="mt-5 grid gap-3">
						{keys.map((key) => (
							<div
								key={key.id}
								className="flex items-center justify-between rounded-xl border border-black/10 p-3"
							>
								<span>
									<strong>{key.name}</strong> <code>{key.start}…</code>
								</span>
								<button
									type="button"
									className="button-danger"
									onClick={async () => {
										await authClient.apiKey.delete({ keyId: key.id });
										await loadKeys();
									}}
								>
									{t("Revoke")}
								</button>
							</div>
						))}
						{!keys.length && <p className="text-ink/60">{t("No keys yet.")}</p>}
					</div>
				</section>
			</div>
		</AppShell>
	);
}
