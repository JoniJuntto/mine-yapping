import { createFileRoute, Link } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { authClient } from "../lib/auth-client";
import { redirectSignedIn } from "../lib/route-guards";
import { AuthCard } from "./login";

export const Route = createFileRoute("/signup")({
	beforeLoad: redirectSignedIn,
	component: Signup,
});

function Signup() {
	const [error, setError] = useState("");
	const [pending, setPending] = useState(false);
	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setPending(true);
		setError("");
		const data = new FormData(event.currentTarget);
		const result = await authClient.signUp.email({
			name: String(data.get("name")),
			email: String(data.get("email")),
			password: String(data.get("password")),
		});
		setPending(false);
		if (result.error) setError(result.error.message ?? "Sign up failed");
		else window.location.href = "/dashboard";
	}
	return (
		<AuthCard
			title="Create your account"
			footer={
				<span>
					Already have one? <Link to="/login">Sign in</Link>
				</span>
			}
		>
			<form onSubmit={submit} className="grid gap-4">
				<label>
					Name
					<input name="name" autoComplete="name" required maxLength={100} />
				</label>
				<label>
					Email
					<input type="email" name="email" autoComplete="email" required />
				</label>
				<label>
					Password
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
					{pending ? "Creating…" : "Create account"}
				</button>
			</form>
		</AuthCard>
	);
}
