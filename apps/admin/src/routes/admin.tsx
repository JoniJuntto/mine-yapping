import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminNav, AppShell } from "../components/app-shell";
import { api } from "../lib/api";
import { requireUser } from "../lib/route-guards";

type Overview = {
	users: number;
	usage: {
		free: Usage;
		byok: Usage;
	};
	failures: Array<{
		id: string;
		email: string;
		createdAt: string;
		latencyMs: number;
		billingMode: "free" | "byok";
	}>;
};
type Usage = {
	requests: number;
	failures: number;
	inputTokens: number;
	outputTokens: number;
	ttsCharacters: number;
};
export const Route = createFileRoute("/admin")({
	beforeLoad: () => requireUser(true),
	component: Admin,
});

function Admin() {
	const [data, setData] = useState<Overview>();
	const [error, setError] = useState("");
	useEffect(() => {
		api<Overview>("/admin/overview")
			.then(setData)
			.catch((cause) => setError(cause.message));
	}, []);
	return (
		<AppShell>
			<AdminNav />
			<p className="eyebrow">Admin</p>
			<h1 className="mt-0 text-4xl">Global overview</h1>
			{error && <p className="alert-error">{error}</p>}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<Metric label="Users" value={data?.users} />
				<Metric label="Free requests" value={data?.usage.free.requests} />
				<Metric label="BYOK requests" value={data?.usage.byok.requests} />
			</div>
			<div className="mt-6 grid gap-4 lg:grid-cols-2">
				<UsageCard label="Free-tier usage" usage={data?.usage.free} />
				<UsageCard label="BYOK usage" usage={data?.usage.byok} />
			</div>
			<section className="card mt-6">
				<h2>Recent failures</h2>
				{data?.failures.map((failure) => (
					<p
						key={failure.id}
						className="flex justify-between border-black/10 border-b pb-2 text-sm"
					>
						<span>{failure.email}</span>
						<span>
							{new Date(failure.createdAt).toLocaleString()} ·{" "}
							{failure.billingMode.toUpperCase()} · {failure.latencyMs} ms
						</span>
					</p>
				))}
				{data && !data.failures.length && (
					<p className="text-ink/60">No recent failures.</p>
				)}
			</section>
		</AppShell>
	);
}
function UsageCard({ label, usage }: { label: string; usage?: Usage }) {
	return (
		<section className="card">
			<h2>{label}</h2>
			<p>{usage?.failures.toLocaleString() ?? "—"} failures</p>
			<p>
				{usage?.inputTokens.toLocaleString() ?? "—"} input tokens ·{" "}
				{usage?.outputTokens.toLocaleString() ?? "—"} output tokens ·{" "}
				{usage?.ttsCharacters.toLocaleString() ?? "—"} spoken characters
			</p>
		</section>
	);
}
function Metric({ label, value }: { label: string; value?: number }) {
	return (
		<article className="card">
			<p className="m-0 text-ink/55 text-sm">{label}</p>
			<strong className="mt-2 block text-3xl">
				{value?.toLocaleString() ?? "—"}
			</strong>
		</article>
	);
}
