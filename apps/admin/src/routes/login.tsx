import { createFileRoute, Link } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { authClient } from "../lib/auth-client";
import { localizedUrl, useI18n } from "../lib/i18n";
import { redirectSignedIn } from "../lib/route-guards";

export const Route = createFileRoute("/login")({
	beforeLoad: redirectSignedIn,
	component: Login,
});

function Login() {
	const { locale, t } = useI18n();
	const [error, setError] = useState("");
	const [forgotPassword, setForgotPassword] = useState(false);
	const [message, setMessage] = useState("");
	const [pending, setPending] = useState(false);
	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setPending(true);
		setError("");
		const data = new FormData(event.currentTarget);
		const result = await authClient.signIn.email({
			email: String(data.get("email")),
			password: String(data.get("password")),
		});
		setPending(false);
		if (result.error) setError(result.error.message ?? t("Sign in failed"));
		else window.location.href = localizedUrl("/dashboard", locale);
	}
	async function requestReset(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setPending(true);
		setError("");
		const data = new FormData(event.currentTarget);
		const result = await authClient.requestPasswordReset({
			email: String(data.get("email")),
			redirectTo: `${window.location.origin}${localizedUrl("/reset-password", locale)}`,
		});
		setPending(false);
		if (result.error)
			setError(result.error.message ?? t("Could not send reset email"));
		else setMessage(t("If that account exists, a reset link is on its way."));
	}
	return (
		<AuthCard
			title={t("Welcome back")}
			footer={
				<span>
					{t("New here?")}{" "}
					<Link to="/signup" search={true}>
						{t("Create an account")}
					</Link>
				</span>
			}
		>
			{forgotPassword ? (
				<form onSubmit={requestReset} className="grid gap-4">
					<p>
						{t(
							"Enter your account email and we’ll send a password reset link.",
						)}
					</p>
					<label>
						{t("Email")}
						<input type="email" name="email" autoComplete="email" required />
					</label>
					{message && <p role="status">{message}</p>}
					{error && (
						<p role="alert" className="alert-error">
							{error}
						</p>
					)}
					<button type="submit" disabled={pending} className="button-primary">
						{pending ? t("Sending…") : t("Send reset email")}
					</button>
					<button
						type="button"
						className="button-secondary"
						onClick={() => setForgotPassword(false)}
					>
						{t("Back to sign in")}
					</button>
				</form>
			) : (
				<>
					<TwitchButton />
					<p className="text-center text-ink/55 text-sm">{t("or use email")}</p>
					<form onSubmit={submit} className="grid gap-4">
						<label>
							{t("Email")}
							<input type="email" name="email" autoComplete="email" required />
						</label>
						<label>
							{t("Password")}
							<input
								type="password"
								name="password"
								autoComplete="current-password"
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
							{pending ? t("Signing in…") : t("Sign in")}
						</button>
						<button
							type="button"
							className="text-sm underline"
							onClick={() => setForgotPassword(true)}
						>
							{t("Forgot password?")}
						</button>
					</form>
				</>
			)}
		</AuthCard>
	);
}

export function TwitchButton() {
	const { locale, t } = useI18n();
	const [error, setError] = useState("");
	const [pending, setPending] = useState(false);
	async function signIn() {
		setPending(true);
		setError("");
		const result = await authClient.signIn.social({
			provider: "twitch",
			callbackURL: localizedUrl("/dashboard", locale),
		});
		setPending(false);
		if (result.error)
			setError(result.error.message ?? t("Twitch sign in failed"));
	}
	return (
		<div className="grid gap-3">
			<button
				type="button"
				disabled={pending}
				className="button-secondary w-full"
				onClick={signIn}
			>
				{pending ? t("Connecting…") : t("Continue with Twitch · 1.5× usage")}
			</button>
			{error && (
				<p role="alert" className="alert-error">
					{error}
				</p>
			)}
		</div>
	);
}

export function AuthCard({
	title,
	children,
	footer,
}: {
	title: string;
	children: React.ReactNode;
	footer: React.ReactNode;
}) {
	return (
		<main className="grid min-h-screen place-items-center p-6">
			<section className="w-full max-w-md">
				<Link to="/" search={true} className="mb-6 flex justify-center">
					<img src="/logo.png" alt="Mine Yapping" className="h-16 w-auto" />
				</Link>
				<div className="card p-8">
					<h1 className="mt-0 text-3xl">{title}</h1>
					{children}
				</div>
				<p className="text-center text-ink/65 text-sm">{footer}</p>
			</section>
		</main>
	);
}
