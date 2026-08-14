import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import { AdminNav, AppShell } from "../components/app-shell";
import { api } from "../lib/api";
import { requireUser } from "../lib/route-guards";

type Settings = {
	monthlyFreeRequests: number;
	polarProductId: string | null;
};
export const Route = createFileRoute("/admin_/settings")({
	beforeLoad: () => requireUser(true),
	component: SettingsPage,
});
function SettingsPage() {
	const [settings, setSettings] = useState<Settings>();
	const [message, setMessage] = useState("");
	useEffect(() => {
		api<Settings>("/admin/settings")
			.then(setSettings)
			.catch((cause) => setMessage(cause.message));
	}, []);
	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		try {
			setSettings(
				await api<Settings>("/admin/settings", {
					method: "PATCH",
					body: JSON.stringify({
						monthlyFreeRequests: Number(data.get("monthlyFreeRequests")),
						polarProductId: String(data.get("polarProductId")),
					}),
				}),
			);
			setMessage("Settings saved.");
		} catch (cause) {
			setMessage(cause instanceof Error ? cause.message : "Could not save");
		}
	}
	return (
		<AppShell>
			<AdminNav />
			<p className="eyebrow">Admin</p>
			<h1 className="mt-0 text-4xl">Global settings</h1>
			<section className="card max-w-2xl">
				{settings ? (
					<form onSubmit={submit} className="grid gap-5">
						<label>
							Monthly free requests
							<input
								type="number"
								name="monthlyFreeRequests"
								min={0}
								max={1_000_000}
								defaultValue={settings.monthlyFreeRequests}
								required
							/>
						</label>
						<label>
							Polar donation product ID
							<input
								name="polarProductId"
								defaultValue={settings.polarProductId ?? ""}
								placeholder="Leave blank to disable donations"
								maxLength={200}
							/>
							<small>
								Use a one-time product. Donations grant no benefits.
							</small>
						</label>
						<button className="button-primary" type="submit">
							Save settings
						</button>
					</form>
				) : (
					<p>Loading…</p>
				)}
				{message && (
					<p role="status" className="mt-4 text-sm">
						{message}
					</p>
				)}
			</section>
		</AppShell>
	);
}
