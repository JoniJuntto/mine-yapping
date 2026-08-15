import { createFileRoute, Link } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { authClient } from "../lib/auth-client";
import { AuthCard } from "./login";

export const Route = createFileRoute("/reset-password")({
	validateSearch: (search: Record<string, unknown>) => ({
		token: typeof search.token === "string" ? search.token : undefined,
	}),
	component: ResetPassword,
});

function ResetPassword() {
	const [error, setError] = useState("");
	const [pending, setPending] = useState(false);
	const [done, setDone] = useState(false);
	const { token } = Route.useSearch();

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!token) return;
		setPending(true);
		setError("");
		const data = new FormData(event.currentTarget);
		const result = await authClient.resetPassword({
			newPassword: String(data.get("password")),
			token,
		});
		setPending(false);
		if (result.error) setError(result.error.message ?? "Password reset failed");
		else setDone(true);
	}

	return (
		<AuthCard
			title="Reset your password"
			footer={<Link to="/login">Sign in</Link>}
		>
			{done ? (
				<p>Your password has been updated. You can now sign in.</p>
			) : token ? (
				<form onSubmit={submit} className="grid gap-4">
					<label>
						New password
						<input
							type="password"
							name="password"
							autoComplete="new-password"
							required
							minLength={8}
						/>
					</label>
					{error && (
						<p role="alert" className="alert-error">
							{error}
						</p>
					)}
					<button type="submit" disabled={pending} className="button-primary">
						{pending ? "Updating…" : "Update password"}
					</button>
				</form>
			) : (
				<p role="alert" className="alert-error">
					This reset link is invalid or expired.
				</p>
			)}
		</AuthCard>
	);
}
