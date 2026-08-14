import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminNav, AppShell } from "../components/app-shell";
import { api } from "../lib/api";
import { requireUser } from "../lib/route-guards";

type Overview = {
	users: number;
	activeSubscriptions: number;
	usage: {
		requests: number;
		failures: number;
		inputTokens: number;
		outputTokens: number;
		ttsCharacters: number;
	};
	failures: Array<{
		id: string;
		email: string;
		createdAt: string;
		latencyMs: number;
	}>;
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
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Metric label="Users" value={data?.users} />
				<Metric
					label="Active subscriptions"
					value={data?.activeSubscriptions}
				/>
				<Metric label="Requests this month" value={data?.usage.requests} />
				<Metric label="Failures" value={data?.usage.failures} />
			</div>
			<section className="card mt-6">
				<h2>Provider usage this month</h2>
				<p>
					{(data?.usage.inputTokens ?? 0).toLocaleString()} input tokens ·{" "}
					{(data?.usage.outputTokens ?? 0).toLocaleString()} output tokens ·{" "}
					{(data?.usage.ttsCharacters ?? 0).toLocaleString()} spoken characters
				</p>
			</section>
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
							{failure.latencyMs} ms
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
