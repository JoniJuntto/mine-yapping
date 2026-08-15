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
			<label className="flex-row flex items-center gap-2 font-semibold text-sm">
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
		</form>
	);
}
