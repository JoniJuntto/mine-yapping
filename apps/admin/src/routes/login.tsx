import { createFileRoute, Link } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { authClient } from "../lib/auth-client";
import { redirectSignedIn } from "../lib/route-guards";

export const Route = createFileRoute("/login")({
	beforeLoad: redirectSignedIn,
	component: Login,
});

function Login() {
	const [error, setError] = useState("");
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
		if (result.error) setError(result.error.message ?? "Sign in failed");
		else window.location.href = "/dashboard";
	}
	return (
		<AuthCard
			title="Welcome back"
			footer={
				<span>
					New here? <Link to="/signup">Create an account</Link>
				</span>
			}
		>
			<form onSubmit={submit} className="grid gap-4">
				<label>
					Email
					<input type="email" name="email" autoComplete="email" required />
				</label>
				<label>
					Password
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
					{pending ? "Signing in…" : "Sign in"}
				</button>
			</form>
		</AuthCard>
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
				<Link
					to="/"
					className="mb-6 block text-center font-black text-accent text-xl"
				>
					Mine Yapping
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
