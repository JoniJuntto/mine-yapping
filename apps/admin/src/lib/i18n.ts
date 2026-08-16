import { useSearch } from "@tanstack/react-router";
import { useEffect } from "react";

export type Locale = "en" | "fi";

const LOCALE_KEY = "mine-yapping.locale";

/** Finnish is the default everywhere; English is opt-in via `?lang=en`. */
export function getLocale(search: unknown): Locale {
	if (search instanceof URLSearchParams)
		return search.get("lang") === "en" ? "en" : "fi";
	if (typeof search === "string")
		return new URLSearchParams(search).get("lang") === "en" ? "en" : "fi";
	return (search as { lang?: unknown } | undefined)?.lang === "en"
		? "en"
		: "fi";
}

/** Root search only stores English; Finnish omits `lang`. */
export function localeSearch(locale: Locale): { lang?: "en" } {
	return locale === "en" ? { lang: "en" } : {};
}

export function localizedUrl(path: string, locale: Locale) {
	if (locale === "fi") return path;
	const url = new URL(path, "https://local.invalid");
	url.searchParams.set("lang", locale);
	return `${url.pathname}${url.search}${url.hash}`;
}

export function alternateLinks(pathname: string) {
	const url = `https://mine-yapper.com${pathname}`;
	return [
		{ rel: "canonical", href: url },
		{ rel: "alternate", hreflang: "fi", href: url },
		{ rel: "alternate", hreflang: "en", href: `${url}?lang=en` },
		{ rel: "alternate", hreflang: "x-default", href: url },
	];
}

// ponytail: localStorage carries the choice across visits without an SSR cookie
// read. The URL stays authoritative during render, so hydration cannot mismatch.
export function storedLocale(): Locale | undefined {
	if (typeof localStorage === "undefined") return undefined;
	const value = localStorage.getItem(LOCALE_KEY);
	return value === "en" || value === "fi" ? value : undefined;
}

export function rememberLocale(locale: Locale) {
	if (typeof localStorage !== "undefined")
		localStorage.setItem(LOCALE_KEY, locale);
}

/**
 * Re-applies a saved English preference when the visitor lands on a bare URL.
 * Runs after hydration, so it navigates rather than changing what was rendered.
 */
export function useRestoreLocale(locale: Locale) {
	useEffect(() => {
		if (locale !== "fi" || storedLocale() !== "en") return;
		const url = new URL(window.location.href);
		url.searchParams.set("lang", "en");
		window.location.replace(url);
	}, [locale]);
}

const fi: Record<string, string> = {
	"Talk to Minecraft mobs and create their personalities.":
		"Puhu Minecraft-hahmoille ja luo niille omat persoonallisuudet.",
	English: "English",
	Finnish: "Suomi",
	Language: "Kieli",
	"Download mod": "Lataa modi",
	"Sign in": "Kirjaudu sisään",
	"Sign out": "Kirjaudu ulos",
	"Get started": "Aloita",
	"Your world finally talks back": "Maailmasi vastaa vihdoin",
	"Give every Minecraft mob a voice.":
		"Anna jokaiselle Minecraft-hahmolle ääni.",
	"Hold V, speak to a mob, and hear an in-character answer. Create your own personalities and keep every encounter memorable.":
		"Pidä V pohjassa, puhu hahmolle ja kuule sen persoonallinen vastaus. Luo omia persoonallisuuksia ja tee jokaisesta kohtaamisesta ikimuistoinen.",
	"Create free account": "Luo ilmainen tili",
	"How it works": "Näin se toimii",
	"You → Cow": "Sinä → Lehmä",
	"What do you think of this village?": "Mitä pidät tästä kylästä?",
	"Betsy → You": "Betsy → Sinä",
	"The hay is acceptable. The architecture lacks commitment.":
		"Heinä kelpaa. Arkkitehtuurista puuttuu kunnianhimoa.",
	Connect: "Yhdistä",
	"Create an account and copy your private Minecraft key.":
		"Luo tili ja kopioi yksityinen Minecraft-avaimesi.",
	Personalize: "Personoi",
	"Write personalities for any mob type or one universal fallback.":
		"Kirjoita persoonallisuus mille tahansa hahmotyypille tai yksi yleinen varavaihtoehto.",
	Talk: "Puhu",
	"Hold V near a mob and continue the conversation naturally.":
		"Pidä V pohjassa hahmon lähellä ja jatka keskustelua luontevasti.",
	"Free and open": "Ilmainen ja avoin",
	"Everyone gets the same Mine Yapping.": "Kaikki saavat saman Mine Yappingin.",
	"Use it": "Käytä",
	"The mod and all its features are free. Twitch sign-in includes 1.5× the standard monthly usage.":
		"Modi ja kaikki sen ominaisuudet ovat ilmaisia. Twitch-kirjautuminen sisältää 1,5-kertaisen kuukausikäytön.",
	"Shared API spend is temporarily unavailable.":
		"Yhteisten API-kulujen tietoa ei juuri nyt ole saatavilla.",
	"Keeping this online costs real money":
		"Palvelun ylläpito maksaa oikeaa rahaa",
	"That’s what I’ve spent on shared API costs this month so nobody has to pay to play. Credits cover the requests that go past the free allowance.":
		"Sen verran olen käyttänyt yhteisiin API-kuluihin tässä kuussa, jotta kenenkään ei tarvitse maksaa pelaamisesta. Krediitit kattavat ilmaiskiintiön ylittävät pyynnöt.",
	"Need more requests?": "Tarvitsetko lisää pyyntöjä?",
	"Buy AI credits when the free allowance runs out. One credit is one request, they never expire, and they unlock nothing — the mod is free either way.":
		"Osta AI-krediittejä, kun ilmaiskiintiö loppuu. Yksi krediitti on yksi pyyntö, ne eivät vanhene eivätkä avaa mitään — modi on joka tapauksessa ilmainen.",
	"Thank you": "Kiitos",
	"Our supporters": "Tukijamme",
	"Be the first supporter.": "Ole ensimmäinen tukija.",
	requests: "pyyntöä",
	"AI credits are not on sale right now.":
		"AI-krediittejä ei ole juuri nyt myynnissä.",
	"AI credits": "AI-krediitit",
	"Credits left": "Krediittejä jäljellä",
	"One credit is one request. Credits never expire and are used only after the monthly free allowance runs out.":
		"Yksi krediitti on yksi pyyntö. Krediitit eivät vanhene, ja ne kuluvat vasta kun kuukausittainen ilmaiskiintiö on käytetty.",
	Dashboard: "Hallintapaneeli",
	Account: "Tili",
	"Connect Minecraft": "Yhdistä Minecraft",
	Terms: "Käyttöehdot",
	Privacy: "Tietosuoja",
	Refunds: "Hyvitykset",
	Support: "Tuki",
	"Welcome back": "Tervetuloa takaisin",
	"New here?": "Uusi täällä?",
	"Create an account": "Luo tili",
	"Enter your account email and we’ll send a password reset link.":
		"Anna tilisi sähköposti, niin lähetämme salasanan palautuslinkin.",
	Email: "Sähköposti",
	Password: "Salasana",
	"Sending…": "Lähetetään…",
	"Send reset email": "Lähetä palautussähköposti",
	"Back to sign in": "Takaisin kirjautumiseen",
	"or use email": "tai käytä sähköpostia",
	"Signing in…": "Kirjaudutaan…",
	"Forgot password?": "Unohditko salasanan?",
	"Connecting…": "Yhdistetään…",
	"Continue with Twitch · 1.5× usage": "Jatka Twitchillä · 1,5× käyttö",
	"Create your account": "Luo tilisi",
	"Already have one?": "Onko sinulla jo tili?",
	"or sign up with email": "tai rekisteröidy sähköpostilla",
	Name: "Nimi",
	"Creating…": "Luodaan…",
	"Create account": "Luo tili",
	"Reset your password": "Palauta salasanasi",
	"Your password has been updated. You can now sign in.":
		"Salasanasi on päivitetty. Voit nyt kirjautua sisään.",
	"New password": "Uusi salasana",
	"Updating…": "Päivitetään…",
	"Update password": "Päivitä salasana",
	"This reset link is invalid or expired.":
		"Palautuslinkki on virheellinen tai vanhentunut.",
	Nickname: "Nimimerkki",
	"Show nickname in the supporters list": "Näytä nimimerkki tukijalistalla",
	"Privacy Policy": "Tietosuojaseloste",
	"Refund Policy": "Hyvityskäytäntö",
	"Requests this month": "Pyyntöjä tässä kuussa",
	"BYOK requests": "Omilla avaimilla tehdyt pyynnöt",
	"AI tokens": "AI-tokenit",
	"Spoken characters": "Puhutut merkit",
	"Profile and connection": "Profiili ja yhteys",
	Profile: "Profiili",
	"Save profile": "Tallenna profiili",
	"Buy AI credits": "Osta AI-krediittejä",
	"Bring your own provider keys": "Käytä omia palveluntarjoaja-avaimia",
	"Use your own OpenAI and ElevenLabs accounts instead of the monthly free allowance.":
		"Käytä omia OpenAI- ja ElevenLabs-tilejä kuukausittaisen ilmaiskäytön sijaan.",
	"The key is encrypted and is never shown again.":
		"Avain salataan eikä sitä näytetä enää uudelleen.",
	"Replace key": "Vaihda avain",
	"Save key": "Tallenna avain",
	"Remove key": "Poista avain",
	"Minecraft API keys": "Minecraft API-avaimet",
	"Join a world and run": "Liity maailmaan ja suorita",
	"Create key": "Luo avain",
	"Copy this now. It will not be shown again.":
		"Kopioi tämä nyt. Sitä ei näytetä uudelleen.",
	Revoke: "Mitätöi",
	"No keys yet.": "Ei vielä avaimia.",
	"Your personalities": "Persoonallisuutesi",
	"Global personalities": "Yleiset persoonallisuudet",
	"Use * as the fallback entity type.":
		"Käytä merkkiä * hahmotyypin varavaihtoehtona.",
	"New personality": "Uusi persoonallisuus",
	Enabled: "Käytössä",
	Edit: "Muokkaa",
	Delete: "Poista",
	"No personalities yet.": "Ei vielä persoonallisuuksia.",
	"Entity type": "Hahmotyyppi",
	"All entities (fallback)": "Kaikki hahmot (varavaihtoehto)",
	Label: "Nimi",
	"System prompt": "Järjestelmäkehote",
	"Saving…": "Tallennetaan…",
	Save: "Tallenna",
	Cancel: "Peruuta",
	"NOT AN OFFICIAL MINECRAFT SERVICE. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.":
		"EI VIRALLINEN MINECRAFT-PALVELU. MOJANG TAI MICROSOFT EI OLE HYVÄKSYNYT PALVELUA EIKÄ SE LIITY NIIHIN.",
	"Sign in failed": "Kirjautuminen epäonnistui",
	"Sign up failed": "Rekisteröityminen epäonnistui",
	"Twitch sign in failed": "Twitch-kirjautuminen epäonnistui",
	"Password reset failed": "Salasanan palautus epäonnistui",
	"Could not send reset email":
		"Palautussähköpostin lähettäminen ei onnistunut",
	"Could not resend email": "Sähköpostin lähettäminen uudelleen ei onnistunut",
	"Could not start checkout": "Maksun aloittaminen ei onnistunut",
	"If that account exists, a reset link is on its way.":
		"Jos tili on olemassa, palautuslinkki on matkalla.",
	"Provider keys saved.": "Palveluntarjoaja-avaimet tallennettu.",
	"Using the free tier.": "Käytössä on ilmainen taso.",
	"Resend verification email": "Lähetä vahvistussähköposti uudelleen",
	"Mob replies, speech recognition, and this site.":
		"Hahmojen vastaukset, puheentunnistus ja tämä sivusto.",
};

export function translate(locale: Locale, text: string) {
	return locale === "fi" ? (fi[text] ?? text) : text;
}

export function useI18n() {
	const locale = getLocale(useSearch({ strict: false }));
	return { locale, t: (text: string) => translate(locale, text) };
}
