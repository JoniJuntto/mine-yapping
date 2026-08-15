import { createFileRoute, Link } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { authClient } from "../lib/auth-client";
import { useI18n } from "../lib/i18n";
import { AuthCard } from "./login";

export const Route = createFileRoute("/reset-password")({
	validateSearch: (search: Record<string, unknown>) => ({
		token: typeof search.token === "string" ? search.token : undefined,
	}),
	component: ResetPassword,
});

function ResetPassword() {
	const { t } = useI18n();
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
		if (result.error)
			setError(result.error.message ?? t("Password reset failed"));
		else setDone(true);
	}

	return (
		<AuthCard
			title={t("Reset your password")}
			footer={
				<Link to="/login" search={true}>
					{t("Sign in")}
				</Link>
			}
		>
			{done ? (
				<p>{t("Your password has been updated. You can now sign in.")}</p>
			) : token ? (
				<form onSubmit={submit} className="grid gap-4">
					<label>
						{t("New password")}
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
						{pending ? t("Updating…") : t("Update password")}
					</button>
				</form>
			) : (
				<p role="alert" className="alert-error">
					{t("This reset link is invalid or expired.")}
				</p>
			)}
		</AuthCard>
	);
}
