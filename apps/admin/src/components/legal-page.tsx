import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LegalFooter } from "./app-shell";

export function LegalPage({
	title,
	updated,
	children,
}: {
	title: string;
	updated: string;
	children: ReactNode;
}) {
	return (
		<>
			<header className="border-black/10 border-b bg-panel/90">
				<div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4">
					<Link to="/">
						<img src="/logo.png" alt="Mine Yapping" className="h-10 w-auto" />
					</Link>
					<nav aria-label="Legal" className="flex flex-wrap gap-3 text-sm">
						<Link
							to="/terms"
							className="font-semibold text-ink/70 hover:text-ink"
						>
							Terms
						</Link>
						<Link
							to="/privacy"
							className="font-semibold text-ink/70 hover:text-ink"
						>
							Privacy
						</Link>
						<Link
							to="/refunds"
							className="font-semibold text-ink/70 hover:text-ink"
						>
							Refunds
						</Link>
					</nav>
				</div>
			</header>
			<main className="mx-auto max-w-3xl px-5 py-10 md:py-14">
				<p className="eyebrow">Legal</p>
				<h1 className="text-4xl md:text-5xl">{title}</h1>
				<p className="mt-2 text-ink/55 text-sm">Last updated: {updated}</p>
				<div className="legal-prose mt-10">{children}</div>
			</main>
			<LegalFooter />
		</>
	);
}
