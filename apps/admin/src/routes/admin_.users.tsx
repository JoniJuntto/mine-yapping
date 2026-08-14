import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { AdminNav, AppShell } from "../components/app-shell";
import { api } from "../lib/api";
import { authClient } from "../lib/auth-client";
import { requireUser } from "../lib/route-guards";

type UserRow = {
	id: string;
	name: string;
	email: string;
	role: string | null;
	banned: boolean | null;
	createdAt: string;
	subscription: string;
	usage: { requests: number };
};
export const Route = createFileRoute("/admin_/users")({
	beforeLoad: () => requireUser(true),
	component: Users,
});

function Users() {
	const [users, setUsers] = useState<UserRow[]>([]);
	const [search, setSearch] = useState("");
	const [error, setError] = useState("");
	const load = useCallback(async (value = "") => {
		try {
			setUsers(
				await api<UserRow[]>(
					`/admin/users${value ? `?search=${encodeURIComponent(value)}` : ""}`,
				),
			);
			setError("");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Could not load users");
		}
	}, []);
	useEffect(() => {
		void load("");
	}, [load]);
	async function action(run: () => Promise<unknown>) {
		try {
			await run();
			await load();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Action failed");
		}
	}
	function submit(event: FormEvent) {
		event.preventDefault();
		void load(search);
	}
	return (
		<AppShell>
			<AdminNav />
			<p className="eyebrow">Admin</p>
			<h1 className="mt-0 text-4xl">Users</h1>
			<form onSubmit={submit} className="mb-6 flex gap-2">
				<input
					aria-label="Search users"
					placeholder="Search name or email"
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					className="max-w-md"
				/>
				<button type="submit" className="button-secondary">
					Search
				</button>
			</form>
			{error && (
				<p role="alert" className="alert-error">
					{error}
				</p>
			)}
			<div className="grid gap-4">
				{users.map((record) => (
					<article className="card" key={record.id}>
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div>
								<h2 className="m-0 text-xl">{record.name}</h2>
								<p className="mt-1 text-ink/60">{record.email}</p>
								<p className="m-0 text-sm">
									{record.subscription} · {record.usage.requests} requests this
									month · joined{" "}
									{new Date(record.createdAt).toLocaleDateString()}
								</p>
							</div>
							<div className="flex flex-wrap gap-2">
								<button
									type="button"
									className="button-secondary"
									onClick={() =>
										action(() =>
											authClient.admin.setRole({
												userId: record.id,
												role: record.role === "admin" ? "user" : "admin",
											}),
										)
									}
								>
									Make {record.role === "admin" ? "user" : "admin"}
								</button>
								{record.banned ? (
									<button
										type="button"
										className="button-secondary"
										onClick={() =>
											action(() =>
												authClient.admin.unbanUser({ userId: record.id }),
											)
										}
									>
										Unban
									</button>
								) : (
									<button
										type="button"
										className="button-danger"
										onClick={() =>
											action(() =>
												authClient.admin.banUser({
													userId: record.id,
													banReason: "Banned by administrator",
												}),
											)
										}
									>
										Ban
									</button>
								)}
								<button
									type="button"
									className="button-danger"
									onClick={() =>
										action(() =>
											api(`/admin/users/${record.id}/api-keys`, {
												method: "DELETE",
											}),
										)
									}
								>
									Revoke keys
								</button>
							</div>
						</div>
					</article>
				))}
				{!users.length && !error && (
					<p className="text-ink/60">No users found.</p>
				)}
			</div>
		</AppShell>
	);
}
