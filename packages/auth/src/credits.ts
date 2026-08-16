/** The credit packs on sale. Prices are VAT-inclusive euros, set so a pack breaks
 * even even if every request in it hits the server's cost caps — see
 * apps/server/src/pricing.test.ts, which fails if a cap moves and prices do not.
 *
 * Kept free of env and better-auth imports so both the server's pricing rules and
 * the auth plugin can read it. */
export const CREDIT_PACKS = [
	// Polar's fixed €0.50 per order is 6% of this one, so it carries the highest
	// price per request — 357 credits is all €7.90 covers at the caps.
	{ slug: "credits-300", credits: 300, grossEur: 7.9 },
	{ slug: "credits-1000", credits: 1000, grossEur: 21.9 },
	{ slug: "credits-1750", credits: 1750, grossEur: 37.9 },
	{ slug: "credits-2500", credits: 2500, grossEur: 53.9 },
] as const;

export type CreditPack = (typeof CREDIT_PACKS)[number];

/** Parses POLAR_CREDIT_PRODUCTS ("credits-1000:prod_x,credits-1750:prod_y"), which
 * maps our slugs onto the product ids Polar generates. Unknown or malformed entries
 * are dropped rather than thrown: a typo should hide one pack, not break checkout. */
export function creditProducts(config: string) {
	return config
		.split(",")
		.flatMap((entry) => {
			const [slug, productId] = entry.trim().split(":");
			const pack = CREDIT_PACKS.find((candidate) => candidate.slug === slug);
			return pack && productId ? [{ productId: productId.trim(), pack }] : [];
		})
		.filter(
			// A product id mapped to two packs would make the grant ambiguous.
			(entry, index, all) =>
				all.findIndex((other) => other.productId === entry.productId) === index,
		);
}

/** The buyer's opt-in name for the public supporters list. Nothing is published
 * without the checkbox, and the length is bounded before it reaches the page. */
export function supporterMetadata(metadata: Record<string, unknown>) {
	const nickname = String(metadata.nickname ?? "")
		.trim()
		.slice(0, 50);
	return {
		nickname: nickname || null,
		showNickname: metadata.showNickname === true && !!nickname,
	};
}
