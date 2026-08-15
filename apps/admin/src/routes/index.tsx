import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalFooter } from "../components/app-shell";
import { DonationForm } from "../components/donation-form";
import { api } from "../lib/api";
import { MOD_DOWNLOAD_URL } from "../lib/mod-download";

type Donor = { nickname: string; amount: number; currency: string };

export const Route = createFileRoute("/")({
	loader: () =>
		Promise.all([
			api<Donor[]>("/donations").catch(() => []),
			api<{ estimatedCostUsd: number }>("/stats").catch(() => ({
				estimatedCostUsd: null,
			})),
		]).then(([donors, stats]) => ({ donors, ...stats })),
	component: Landing,
});

function Landing() {
	const { donors, estimatedCostUsd } = Route.useLoaderData();
	return (
		<>
			<main>
				<nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
					<strong className="text-accent text-xl">Mine Yapping</strong>
					<div className="flex gap-2">
						<a href={MOD_DOWNLOAD_URL} className="button-secondary">
							Download mod
						</a>
						<Link to="/login" className="button-secondary">
							Sign in
						</Link>
						<Link to="/signup" className="button-primary">
							Get started
						</Link>
					</div>
				</nav>
				<section className="mx-auto grid min-h-[70vh] max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-2">
					<div>
						<p className="eyebrow">Your world finally talks back</p>
						<h1 className="max-w-3xl text-5xl leading-[1.05] md:text-7xl">
							Give every Minecraft mob a voice.
						</h1>
						<p className="max-w-xl text-ink/70 text-xl leading-8">
							Hold V, speak to a mob, and hear an in-character answer. Create
							your own personalities and keep every encounter memorable.
						</p>
						<div className="mt-8 flex flex-wrap gap-3">
							<a href={MOD_DOWNLOAD_URL} className="button-primary px-6 py-3">
								Download mod
							</a>
							<Link to="/signup" className="button-secondary px-6 py-3">
								Create free account
							</Link>
							<a href="#how-it-works" className="button-secondary px-6 py-3">
								How it works
							</a>
						</div>
					</div>
					<div className="relative rounded-[2rem] bg-ink p-8 text-paper shadow-2xl">
						<p className="font-mono text-lime-300 text-sm">You → Cow</p>
						<p className="text-xl">“What do you think of this village?”</p>
						<div className="my-7 h-px bg-white/15" />
						<p className="font-mono text-amber-300 text-sm">Betsy → You</p>
						<p className="text-2xl leading-9">
							“The hay is acceptable. The architecture lacks commitment.”
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
								"Connect",
								"Create an account and copy your private Minecraft key.",
							],
							[
								"2",
								"Personalize",
								"Write personalities for any mob type or one universal fallback.",
							],
							[
								"3",
								"Talk",
								"Hold V near a mob and continue the conversation naturally.",
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
					<p className="eyebrow">Free and open</p>
					<h2 className="text-4xl">Everyone gets the same Mine Yapping.</h2>
					<div className="mt-8 grid gap-5 text-left md:grid-cols-2">
						<article className="card">
							<h3 className="text-2xl">Use it</h3>
							<p className="font-black text-3xl">€0</p>
							<p className="text-ink/65">
								The mod and all its features are free. Twitch sign-in includes
								1.5× the standard monthly usage.
							</p>
							<p className="font-semibold">
								{estimatedCostUsd === null
									? "Shared API spend is temporarily unavailable."
									: `${new Intl.NumberFormat("en", {
											style: "currency",
											currency: "USD",
										}).format(
											estimatedCostUsd,
										)} estimated shared API spend this month.`}
							</p>
						</article>
						<article className="card border-accent/40">
							<h3 className="text-2xl">Support it</h3>
							<p className="text-ink/65">
								Donations are optional and never unlock features or increase
								usage.
							</p>
							<DonationForm />
						</article>
					</div>
				</section>
				<section className="border-black/10 border-t bg-panel">
					<div className="mx-auto max-w-4xl px-5 py-16">
						<p className="eyebrow">Thank you</p>
						<h2 className="text-4xl">Our donors</h2>
						{donors.length ? (
							<ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
								{donors.map((donor, index) => (
									<li
										key={`${donor.nickname}-${donor.currency}-${index}`}
										className="card flex items-center justify-between gap-4"
									>
										<span className="font-semibold">{donor.nickname}</span>
										<span>
											{new Intl.NumberFormat("en", {
												style: "currency",
												currency: donor.currency,
											}).format(donor.amount / 100)}
										</span>
									</li>
								))}
							</ul>
						) : (
							<p className="text-ink/65">Be the first donor.</p>
						)}
					</div>
				</section>
			</main>
			<LegalFooter />
		</>
	);
}
