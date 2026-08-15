import { Link } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { authClient } from "../lib/auth-client";

export function DonationForm({ defaultNickname = "" }) {
	const [error, setError] = useState("");

	async function donate(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		const result = await authClient.checkout({
			slug: "donate",
			metadata: {
				nickname: String(data.get("nickname")).trim(),
				showNickname: data.get("showNickname") === "on",
			},
		});
		if (result.error)
			setError(result.error.message ?? "Could not start donation checkout");
	}

	return (
		<form onSubmit={donate} className="grid gap-3">
			<label>
				Nickname
				<input
					name="nickname"
					defaultValue={defaultNickname}
					maxLength={50}
					required
				/>
			</label>
			<label className="flex flex-row items-center gap-2 font-semibold text-sm">
				<input name="showNickname" type="checkbox" />
				Show nickname in donations list
			</label>
			{error && (
				<p role="alert" className="alert-error">
					{error}
				</p>
			)}
			<button type="submit" className="button-primary">
				Donate with Polar
			</button>
			<p className="text-ink/55 text-xs leading-5">
				Donations are optional, from €1, and do not unlock features. By
				continuing you agree to the{" "}
				<Link to="/terms" className="underline underline-offset-2">
					Terms
				</Link>
				,{" "}
				<Link to="/privacy" className="underline underline-offset-2">
					Privacy Policy
				</Link>
				, and{" "}
				<Link to="/refunds" className="underline underline-offset-2">
					Refund Policy
				</Link>
				. Support:{" "}
				<a
					href="mailto:joni@pohina.group"
					className="underline underline-offset-2"
				>
					joni@pohina.group
				</a>
				.
			</p>
		</form>
	);
}
