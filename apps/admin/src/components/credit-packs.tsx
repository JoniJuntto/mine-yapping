import { Link } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { authClient } from "../lib/auth-client";
import { useI18n } from "../lib/i18n";

export type CreditPack = {
	slug: string;
	credits: number;
	grossEur: number;
};

export function CreditPacks({
	packs,
	defaultNickname = "",
}: {
	packs: CreditPack[];
	defaultNickname?: string;
}) {
	const { locale, t } = useI18n();
	const [error, setError] = useState("");

	async function buy(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		const slug = String(data.get("slug"));
		const result = await authClient.checkout({
			slug,
			metadata: {
				nickname: String(data.get("nickname")).trim(),
				showNickname: data.get("showNickname") === "on",
			},
		});
		if (result.error)
			setError(result.error.message ?? t("Could not start checkout"));
	}

	const price = (value: number) =>
		new Intl.NumberFormat(locale, {
			style: "currency",
			currency: "EUR",
		}).format(value);

	if (!packs.length)
		return (
			<p className="text-ink/65">
				{t("AI credits are not on sale right now.")}
			</p>
		);

	return (
		<form onSubmit={buy} className="grid gap-3">
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
				{t("Show nickname in the supporters list")}
			</label>
			<div className="grid gap-2">
				{packs.map((pack) => (
					<button
						key={pack.slug}
						type="submit"
						name="slug"
						value={pack.slug}
						className="button-primary flex items-center justify-between gap-4"
					>
						<span>
							{new Intl.NumberFormat(locale).format(pack.credits)}{" "}
							{t("requests")}
						</span>
						<span>{price(pack.grossEur)}</span>
					</button>
				))}
			</div>
			{/* Digital content delivered immediately: without this explicit consent the
			    14-day right of withdrawal in KSL 6 luku stays alive after delivery. */}
			<label className="flex flex-row items-start gap-2 text-sm">
				<input name="immediateDelivery" type="checkbox" required />
				<span>
					{locale === "fi"
						? "Pyydän toimituksen heti ja ymmärrän, että käytetyistä krediiteistä ei saa peruutusoikeutta. Käyttämättömät krediitit voi palauttaa 14 päivän kuluessa."
						: "I ask for immediate delivery and understand that used credits lose the right of withdrawal. Unused credits can be refunded within 14 days."}
				</span>
			</label>
			{error && (
				<p role="alert" className="alert-error">
					{error}
				</p>
			)}
			<p className="text-ink/55 text-xs leading-5">
				{locale === "fi"
					? "Krediitit ovat AI-käyttöä: yksi krediitti = yksi pyyntö. Ne eivät vanhene eivätkä avaa ominaisuuksia — modi ja sen ominaisuudet ovat ilmaisia. Hinnat sisältävät alv:n. Jatkamalla hyväksyt "
					: "Credits are AI usage: one credit = one request. They never expire and unlock no features — the mod and its features are free. Prices include VAT. By continuing you agree to the "}
				<Link
					to="/terms"
					search={true}
					className="underline underline-offset-2"
				>
					{t("Terms")}
				</Link>
				{", "}
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
