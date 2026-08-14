import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { authClient } from "../lib/auth-client";

const navClass =
	"rounded-lg px-3 py-2 text-sm font-semibold text-ink/70 hover:bg-black/5";

export function AppShell({ children }: { children: ReactNode }) {
	const { data } = authClient.useSession();
	const role = (data?.user as { role?: string } | undefined)?.role;
	return (
		<>
			<header className="border-black/10 border-b bg-panel/90">
				<div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
					<Link to="/" className="font-black text-accent text-xl">
						Mine Yapping
					</Link>
					<nav
						aria-label="Account"
						className="flex flex-wrap items-center gap-1"
					>
						<Link to="/dashboard" className={navClass}>
							Dashboard
						</Link>
						<Link to="/dashboard/account" className={navClass}>
							Account
						</Link>
						{role?.split(",").includes("admin") && (
							<Link to="/admin" className={navClass}>
								Admin
							</Link>
						)}
						<button
							type="button"
							onClick={() =>
								authClient.signOut().then(() => (window.location.href = "/"))
							}
							className={navClass}
						>
							Sign out
						</button>
					</nav>
				</div>
			</header>
			<main className="mx-auto w-full max-w-6xl p-5 md:p-10">{children}</main>
			<LegalFooter />
		</>
	);
}

export function LegalFooter() {
	return (
		<footer className="mx-auto max-w-6xl px-5 py-8 text-center text-ink/60 text-sm">
			NOT AN OFFICIAL MINECRAFT SERVICE. NOT APPROVED BY OR ASSOCIATED WITH
			MOJANG OR MICROSOFT.
		</footer>
	);
}

export function AdminNav() {
	return (
		<nav aria-label="Admin" className="mb-8 flex flex-wrap gap-2">
			<Link to="/admin" className={navClass} activeOptions={{ exact: true }}>
				Overview
			</Link>
			<Link to="/admin/users" className={navClass}>
				Users
			</Link>
			<Link to="/admin/personalities" className={navClass}>
				Global personalities
			</Link>
			<Link to="/admin/settings" className={navClass}>
				Settings
			</Link>
		</nav>
	);
}
