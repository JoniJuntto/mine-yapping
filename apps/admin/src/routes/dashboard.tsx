import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "../components/app-shell";
import { PersonalityManager } from "../components/personality-manager";
import { api } from "../lib/api";
import { requireUser } from "../lib/route-guards";

type Summary = {
	user: { name: string; email: string };
	usage: {
		requests: number;
		byokRequests: number;
		inputTokens: number;
		outputTokens: number;
		ttsCharacters: number;
	};
	monthlyRequestLimit: number;
};

export const Route = createFileRoute("/dashboard")({
	beforeLoad: () => requireUser(),
	component: Dashboard,
});

function Dashboard() {
	const [summary, setSummary] = useState<Summary>();
	const [error, setError] = useState("");
	useEffect(() => {
		api<Summary>("/me/summary")
			.then(setSummary)
			.catch((cause) => setError(cause.message));
	}, []);
	return (
		<AppShell>
			<div className="mb-10 flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="eyebrow">Dashboard</p>
					<h1 className="m-0 text-4xl">
						Hello{summary ? `, ${summary.user.name}` : ""}.
					</h1>
				</div>
				<Link to="/dashboard/account" className="button-secondary">
					Connect Minecraft
				</Link>
			</div>
			{error && (
				<p role="alert" className="alert-error">
					{error}
				</p>
			)}
			<div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Stat
					label="Requests this month"
					value={
						summary
							? `${summary.usage.requests} / ${summary.monthlyRequestLimit}`
							: "—"
					}
				/>
				<Stat
					label="BYOK requests"
					value={summary?.usage.byokRequests.toLocaleString() ?? "—"}
				/>
				<Stat
					label="AI tokens"
					value={
						summary
							? (
									summary.usage.inputTokens + summary.usage.outputTokens
								).toLocaleString()
							: "—"
					}
				/>
				<Stat
					label="Spoken characters"
					value={summary?.usage.ttsCharacters.toLocaleString() ?? "—"}
				/>
			</div>
			<PersonalityManager />
		</AppShell>
	);
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<article className="card">
			<p className="m-0 text-ink/55 text-sm">{label}</p>
			<strong className="mt-2 block text-2xl">{value}</strong>
		</article>
	);
}
