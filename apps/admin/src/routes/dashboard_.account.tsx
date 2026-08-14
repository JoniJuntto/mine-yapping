import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { AppShell } from "../components/app-shell";
import { api } from "../lib/api";
import { authClient } from "../lib/auth-client";
import { requireUser } from "../lib/route-guards";

type Key = {
	id: string;
	name: string | null;
	start: string | null;
	createdAt: Date;
};
type Summary = {
	user: { name: string; email: string };
	subscription: string;
	checkoutEnabled: boolean;
};

export const Route = createFileRoute("/dashboard_/account")({
	beforeLoad: () => requireUser(),
	component: Account,
});

function Account() {
	const [summary, setSummary] = useState<Summary>();
	const [keys, setKeys] = useState<Key[]>([]);
	const [newKey, setNewKey] = useState("");
	const [error, setError] = useState("");
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

	return (
		<AppShell>
			<p className="eyebrow">Account</p>
			<h1 className="mt-0 text-4xl">Profile and connection</h1>
			{error && (
				<p role="alert" className="alert-error">
					{error}
				</p>
			)}
			<div className="grid gap-6 lg:grid-cols-2">
				<section className="card">
					<h2>Profile</h2>
					<form onSubmit={updateProfile} className="grid gap-4">
						<label>
							Name
							<input
								name="name"
								defaultValue={summary?.user.name}
								required
								maxLength={100}
							/>
						</label>
						<label>
							Email
							<input value={summary?.user.email ?? ""} disabled />
						</label>
						<button className="button-primary" type="submit">
							Save profile
						</button>
					</form>
				</section>
				<section className="card">
					<h2>Subscription</h2>
					<p>
						You are on the <strong>{summary?.subscription ?? "…"}</strong> plan.
					</p>
					<div className="flex flex-wrap gap-2">
						{summary?.subscription !== "pro" && summary?.checkoutEnabled && (
							<button
								type="button"
								className="button-primary"
								onClick={() => authClient.checkout({ slug: "pro" })}
							>
								Upgrade
							</button>
						)}
						<button
							type="button"
							className="button-secondary"
							onClick={() => authClient.customer.portal()}
						>
							Open billing portal
						</button>
					</div>
				</section>
				<section className="card lg:col-span-2">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h2 className="mb-1">Minecraft API keys</h2>
							<p className="m-0 text-ink/60">
								Join a world and run <code>/login &lt;token&gt;</code>.
							</p>
						</div>
						<button
							type="button"
							className="button-primary"
							onClick={createKey}
						>
							Create key
						</button>
					</div>
					{newKey && (
						<div className="my-5 rounded-xl bg-lime-100 p-4">
							<strong>Copy this now. It will not be shown again.</strong>
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
									Revoke
								</button>
							</div>
						))}
						{!keys.length && <p className="text-ink/60">No keys yet.</p>}
					</div>
				</section>
			</div>
		</AppShell>
	);
}
