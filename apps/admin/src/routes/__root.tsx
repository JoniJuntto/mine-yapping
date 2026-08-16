import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import {
	alternateLinks,
	getLocale,
	translate,
	useRestoreLocale,
} from "../lib/i18n";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
	validateSearch: (search: Record<string, unknown>): { lang?: "en" } =>
		search.lang === "en" ? { lang: "en" } : {},
	head: ({ match }) => {
		const locale = getLocale(match.search);
		return {
			meta: [
				{ charSet: "utf-8" },
				{ name: "viewport", content: "width=device-width, initial-scale=1" },
				{ title: "Mine Yapping" },
				{
					name: "description",
					content: translate(
						locale,
						"Talk to Minecraft mobs and create their personalities.",
					),
				},
				{ property: "og:title", content: "Mine Yapping" },
				{
					property: "og:description",
					content: translate(
						locale,
						"Talk to Minecraft mobs and create their personalities.",
					),
				},
				{ property: "og:locale", content: locale === "fi" ? "fi_FI" : "en_US" },
				{ property: "og:type", content: "website" },
			],
			links: [
				{ rel: "stylesheet", href: appCss },
				...alternateLinks(match.pathname),
			],
		};
	},
	component: Root,
});

function Root() {
	const locale = getLocale(Route.useSearch());
	useRestoreLocale(locale);
	return (
		<html lang={locale}>
			<head>
				<HeadContent />
				<script
					src="https://analytics.huikaton.online/api/script.js"
					data-site-id="319a09fa9674"
					defer
				/>
			</head>
			<body>
				<Outlet />
				<Scripts />
			</body>
		</html>
	);
}
