import { useSearch } from "@tanstack/react-router";

export type Locale = "en" | "fi";

export function getLocale(search: unknown): Locale {
	if (search instanceof URLSearchParams)
		return search.get("lang") === "fi" ? "fi" : "en";
	if (typeof search === "string")
		return new URLSearchParams(search).get("lang") === "fi" ? "fi" : "en";
	return (search as { lang?: unknown } | undefined)?.lang === "fi"
		? "fi"
		: "en";
}

export function localizedUrl(path: string, locale: Locale) {
	if (locale === "en") return path;
	const url = new URL(path, "https://local.invalid");
	url.searchParams.set("lang", locale);
	return `${url.pathname}${url.search}${url.hash}`;
}

export function alternateLinks(pathname: string) {
	const url = `https://mine-yapper.com${pathname}`;
	return [
		{ rel: "canonical", href: url },
		{ rel: "alternate", hreflang: "en", href: url },
		{ rel: "alternate", hreflang: "fi", href: `${url}?lang=fi` },
		{ rel: "alternate", hreflang: "x-default", href: url },
	];
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
	"Support it": "Tue",
	"Donations are optional and never unlock features or increase usage.":
		"Lahjoitukset ovat vapaaehtoisia eivätkä avaa ominaisuuksia tai lisää käyttöä.",
	"Thank you": "Kiitos",
	"Our donors": "Lahjoittajamme",
	"Be the first donor.": "Ole ensimmäinen lahjoittaja.",
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
	"Show nickname in donations list": "Näytä nimimerkki lahjoittajalistalla",
	"Donate with Polar": "Lahjoita Polarilla",
	"Privacy Policy": "Tietosuojaseloste",
	"Refund Policy": "Hyvityskäytäntö",
	"Requests this month": "Pyyntöjä tässä kuussa",
	"BYOK requests": "Omilla avaimilla tehdyt pyynnöt",
	"AI tokens": "AI-tokenit",
	"Spoken characters": "Puhutut merkit",
	"Profile and connection": "Profiili ja yhteys",
	Profile: "Profiili",
	"Save profile": "Tallenna profiili",
	"Support Mine Yapping": "Tue Mine Yappingia",
	"Donations are optional and never change features or usage limits.":
		"Lahjoitukset ovat vapaaehtoisia eivätkä muuta ominaisuuksia tai käyttörajoja.",
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
};

export function translate(locale: Locale, text: string) {
	return locale === "fi" ? (fi[text] ?? text) : text;
}

export function useI18n() {
	const locale = getLocale(useSearch({ strict: false }));
	return { locale, t: (text: string) => translate(locale, text) };
}
