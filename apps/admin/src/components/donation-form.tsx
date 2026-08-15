import { Link } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { authClient } from "../lib/auth-client";
import { useI18n } from "../lib/i18n";

export function DonationForm({ defaultNickname = "" }) {
	const { locale, t } = useI18n();
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
			setError(result.error.message ?? t("Could not start donation checkout"));
	}

	return (
		<form onSubmit={donate} className="grid gap-3">
			<label>
				{t("Nickname")}
				<input
					name="nickname"
					defaultValue={defaultNickname}
					maxLength={50}
					required
				/>
			</label>
			<label className="flex flex-row items-center gap-2 font-semibold text-sm">
				<input name="showNickname" type="checkbox" />
				{t("Show nickname in donations list")}
			</label>
			{error && (
				<p role="alert" className="alert-error">
					{error}
				</p>
			)}
			<button type="submit" className="button-primary">
				{t("Donate with Polar")}
			</button>
			<p className="text-ink/55 text-xs leading-5">
				{locale === "fi"
					? "Lahjoitukset ovat vapaaehtoisia, alkavat yhdestä eurosta eivätkä avaa ominaisuuksia. Jatkamalla hyväksyt "
					: "Donations are optional, from €1, and do not unlock features. By continuing you agree to the "}
				<Link
					to="/terms"
					search={true}
					className="underline underline-offset-2"
				>
					{t("Terms")}
				</Link>
				{locale === "fi" ? ", " : ", "}
				<Link
					to="/privacy"
					search={true}
					className="underline underline-offset-2"
				>
					{t("Privacy Policy")}
				</Link>
				{locale === "fi" ? " sekä " : ", and "}
				<Link
					to="/refunds"
					search={true}
					className="underline underline-offset-2"
				>
					{t("Refund Policy")}
				</Link>
				{locale === "fi" ? ". Tuki: " : ". Support: "}
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
