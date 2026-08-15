import { createFileRoute, Link } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { authClient } from "../lib/auth-client";
import { localizedUrl, useI18n } from "../lib/i18n";
import { redirectSignedIn } from "../lib/route-guards";
import { AuthCard, TwitchButton } from "./login";

export const Route = createFileRoute("/signup")({
	beforeLoad: redirectSignedIn,
	component: Signup,
});

function Signup() {
	const { locale, t } = useI18n();
	const [error, setError] = useState("");
	const [sentTo, setSentTo] = useState("");
	const [pending, setPending] = useState(false);
	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setPending(true);
		setError("");
		const data = new FormData(event.currentTarget);
		const email = String(data.get("email"));
		const result = await authClient.signUp.email({
			name: String(data.get("name")),
			email,
			password: String(data.get("password")),
			callbackURL: localizedUrl("/dashboard", locale),
		});
		setPending(false);
		if (result.error) setError(result.error.message ?? t("Sign up failed"));
		else setSentTo(email);
	}
	async function resend() {
		setPending(true);
		setError("");
		const result = await authClient.sendVerificationEmail({
			email: sentTo,
			callbackURL: localizedUrl("/dashboard", locale),
		});
		setPending(false);
		if (result.error)
			setError(result.error.message ?? t("Could not resend email"));
	}
	return (
		<AuthCard
			title={t("Create your account")}
			footer={
				<span>
					{t("Already have one?")}{" "}
					<Link to="/login" search={true}>
						{t("Sign in")}
					</Link>
				</span>
			}
		>
			{sentTo ? (
				<div className="grid gap-4">
					<p>
						{locale === "fi"
							? `Tarkista osoitteeseen ${sentTo} lähetetty vahvistuslinkki ennen kirjautumista.`
							: `Check ${sentTo} for a verification link before signing in.`}
					</p>
					{error && (
						<p role="alert" className="alert-error">
							{error}
						</p>
					)}
					<button
						type="button"
						disabled={pending}
						className="button-secondary"
						onClick={resend}
					>
						{pending ? t("Sending…") : t("Resend verification email")}
					</button>
				</div>
			) : (
				<>
					<TwitchButton />
					<p className="text-center text-ink/55 text-sm">
						{t("or sign up with email")}
					</p>
					<form onSubmit={submit} className="grid gap-4">
						<label>
							{t("Name")}
							<input name="name" autoComplete="name" required maxLength={100} />
						</label>
						<label>
							{t("Email")}
							<input type="email" name="email" autoComplete="email" required />
						</label>
						<label>
							{t("Password")}
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
							{pending ? t("Creating…") : t("Create account")}
						</button>
					</form>
				</>
			)}
		</AuthCard>
	);
}
