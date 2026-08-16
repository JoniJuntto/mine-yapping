import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalFooter } from "../components/app-shell";
import { type CreditPack, CreditPacks } from "../components/credit-packs";
import { api } from "../lib/api";
import { getLocale, localeSearch, translate } from "../lib/i18n";
import { MOD_DOWNLOAD_URL } from "../lib/mod-download";

type Supporter = { nickname: string; credits: number };

export const Route = createFileRoute("/")({
	loader: () =>
		Promise.all([
			api<Supporter[]>("/supporters").catch(() => []),
			api<{ estimatedCostUsd: number }>("/stats").catch(() => ({
				estimatedCostUsd: null,
			})),
			api<{ packs: CreditPack[] }>("/packs").catch(() => ({ packs: [] })),
		]).then(([supporters, stats, { packs }]) => ({
			supporters,
			packs,
			...stats,
		})),
	component: Landing,
});

function Landing() {
	const { supporters, packs, estimatedCostUsd } = Route.useLoaderData();
	const locale = getLocale(Route.useSearch());
	const t = (text: string) => translate(locale, text);
	return (
		<>
			<main>
				<nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
					<img src="/logo.png" alt="Mine Yapping" className="h-10 w-auto" />
					<div className="flex gap-2">
						<a href={MOD_DOWNLOAD_URL} className="button-secondary">
							{t("Download mod")}
						</a>
						<Link
							to="/login"
							search={localeSearch(locale)}
							className="button-secondary"
						>
							{t("Sign in")}
						</Link>
						<Link
							to="/signup"
							search={localeSearch(locale)}
							className="button-primary"
						>
							{t("Get started")}
						</Link>
					</div>
				</nav>
				<section className="mx-auto grid min-h-[70vh] max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-2">
					<div>
						<p className="eyebrow">{t("Your world finally talks back")}</p>
						<h1 className="max-w-3xl text-5xl leading-[1.05] md:text-7xl">
							{t("Give every Minecraft mob a voice.")}
						</h1>
						<p className="max-w-xl text-ink/70 text-xl leading-8">
							{t(
								"Hold V, speak to a mob, and hear an in-character answer. Create your own personalities and keep every encounter memorable.",
							)}
						</p>
						<div className="mt-8 flex flex-wrap gap-3">
							<a href={MOD_DOWNLOAD_URL} className="button-primary px-6 py-3">
								{t("Download mod")}
							</a>
							<Link
								to="/signup"
								search={localeSearch(locale)}
								className="button-secondary px-6 py-3"
							>
								{t("Create free account")}
							</Link>
							<a href="#how-it-works" className="button-secondary px-6 py-3">
								{t("How it works")}
							</a>
						</div>
					</div>
					<div className="relative rounded-[2rem] bg-ink p-8 text-paper shadow-2xl">
						<p className="font-mono text-lime-300 text-sm">{t("You → Cow")}</p>
						<p className="text-xl">
							“{t("What do you think of this village?")}”
						</p>
						<div className="my-7 h-px bg-white/15" />
						<p className="font-mono text-amber-300 text-sm">
							{t("Betsy → You")}
						</p>
						<p className="text-2xl leading-9">
							“{t("The hay is acceptable. The architecture lacks commitment.")}”
						</p>
					</div>
				</section>
				<section
					id="how-it-works"
					className="border-black/10 border-y bg-panel"
				>
					<div className="mx-auto grid max-w-6xl gap-5 px-5 py-16 md:grid-cols-3">
						{[
							[
								"1",
								t("Connect"),
								t("Create an account and copy your private Minecraft key."),
							],
							[
								"2",
								t("Personalize"),
								t(
									"Write personalities for any mob type or one universal fallback.",
								),
							],
							[
								"3",
								t("Talk"),
								t("Hold V near a mob and continue the conversation naturally."),
							],
						].map(([number, title, copy]) => (
							<article key={number} className="card">
								<span className="font-black text-3xl text-accent">
									{number}
								</span>
								<h2>{title}</h2>
								<p className="text-ink/65">{copy}</p>
							</article>
						))}
					</div>
				</section>
				<section className="mx-auto max-w-4xl px-5 py-16 text-center">
					<p className="eyebrow">{t("Free and open")}</p>
					<h2 className="text-4xl">
						{t("Everyone gets the same Mine Yapping.")}
					</h2>
					<div className="mt-8 grid gap-5 text-left md:grid-cols-2">
						<article className="card">
							<h3 className="text-2xl">{t("Use it")}</h3>
							<p className="font-black text-3xl">€0</p>
							<p className="text-ink/65">
								{t(
									"The mod and all its features are free. Twitch sign-in includes 1.5× the standard monthly usage.",
								)}
							</p>
						</article>
						<article className="card border-accent/40">
							<h3 className="text-2xl">{t("Need more requests?")}</h3>
							<p className="text-ink/65">
								{t(
									"Buy AI credits when the free allowance runs out. One credit is one request, they never expire, and they unlock nothing — the mod is free either way.",
								)}
							</p>
							<CreditPacks packs={packs} />
						</article>
					</div>
					<article className="card mt-5 border-accent/40 text-left">
						<h3 className="text-2xl">
							{t("Keeping this online costs real money")}
						</h3>
						<p className="font-black text-3xl">
							{estimatedCostUsd === null
								? "—"
								: new Intl.NumberFormat(locale, {
										style: "currency",
										currency: "EUR",
									}).format(estimatedCostUsd)}
						</p>
						<p className="text-ink/65">
							{estimatedCostUsd === null
								? t("Shared API spend is temporarily unavailable.")
								: t(
										"That’s what I’ve spent on shared API costs this month so nobody has to pay to play. Credits cover the requests that go past the free allowance.",
									)}
						</p>
					</article>
				</section>
				<section className="border-black/10 border-t bg-panel">
					<div className="mx-auto max-w-4xl px-5 py-16">
						<p className="eyebrow">{t("Thank you")}</p>
						<h2 className="text-4xl">{t("Our supporters")}</h2>
						{supporters.length ? (
							<ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
								{supporters.map((supporter) => (
									<li
										key={`${supporter.nickname}-${supporter.credits}`}
										className="card flex items-center justify-between gap-4"
									>
										<span className="font-semibold">{supporter.nickname}</span>
										<span>
											{new Intl.NumberFormat(locale).format(supporter.credits)}{" "}
											{t("requests")}
										</span>
									</li>
								))}
							</ul>
						) : (
							<p className="text-ink/65">{t("Be the first supporter.")}</p>
						)}
					</div>
				</section>
			</main>
			<LegalFooter />
		</>
	);
}
