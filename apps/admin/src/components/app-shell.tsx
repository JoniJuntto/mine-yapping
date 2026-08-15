import { Link, useLocation, useSearch } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { authClient } from "../lib/auth-client";
import { getLocale, localizedUrl, translate } from "../lib/i18n";
import { MOD_DOWNLOAD_URL } from "../lib/mod-download";

const navClass =
	"rounded-lg px-3 py-2 text-sm font-semibold text-ink/70 hover:bg-black/5";

export function AppShell({ children }: { children: ReactNode }) {
	const locale = getLocale(useSearch({ strict: false }));
	const t = (text: string) => translate(locale, text);
	const { data } = authClient.useSession();
	const role = (data?.user as { role?: string } | undefined)?.role;
	return (
		<>
			<header className="border-black/10 border-b bg-panel/90">
				<div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
					<Link to="/" search={true} className="font-black text-accent text-xl">
						Mine Yapping
					</Link>
					<nav
						aria-label={t("Account")}
						className="flex flex-wrap items-center gap-1"
					>
						<Link to="/dashboard" search={true} className={navClass}>
							{t("Dashboard")}
						</Link>
						<Link to="/dashboard/account" search={true} className={navClass}>
							{t("Account")}
						</Link>
						<a href={MOD_DOWNLOAD_URL} className={navClass}>
							{t("Download mod")}
						</a>
						{role?.split(",").includes("admin") && (
							<Link to="/admin" search={true} className={navClass}>
								Admin
							</Link>
						)}
						<button
							type="button"
							onClick={() =>
								authClient
									.signOut()
									.then(
										() => (window.location.href = localizedUrl("/", locale)),
									)
							}
							className={navClass}
						>
							{t("Sign out")}
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
	const locale = getLocale(useSearch({ strict: false }));
	const t = (text: string) => translate(locale, text);
	const linkClass =
		"font-semibold text-ink/70 underline-offset-2 hover:text-ink hover:underline";
	return (
		<footer className="mx-auto max-w-6xl space-y-3 px-5 py-8 text-center text-ink/60 text-sm">
			<p>
				{t(
					"NOT AN OFFICIAL MINECRAFT SERVICE. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.",
				)}
			</p>
			<p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
				<Link to="/terms" search={true} className={linkClass}>
					{t("Terms")}
				</Link>
				<Link to="/privacy" search={true} className={linkClass}>
					{t("Privacy")}
				</Link>
				<Link to="/refunds" search={true} className={linkClass}>
					{t("Refunds")}
				</Link>
				<a href="mailto:joni@pohina.group" className={linkClass}>
					{t("Support")}
				</a>
				<LanguageSwitch />
			</p>
		</footer>
	);
}

function LanguageSwitch() {
	const location = useLocation();
	const locale = getLocale(useSearch({ strict: false }));
	return (
		<span>
			<span className="sr-only">{translate(locale, "Language")}: </span>
			<a
				href={localizedUrl(location.pathname, "en")}
				className={locale === "en" ? "font-black text-ink" : undefined}
			>
				EN
			</a>
			{" / "}
			<a
				href={localizedUrl(location.pathname, "fi")}
				className={locale === "fi" ? "font-black text-ink" : undefined}
			>
				FI
			</a>
		</span>
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
