import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "../components/legal-page";

export const Route = createFileRoute("/terms")({
	head: () => ({
		meta: [{ title: "Terms of Service · Mine Yapping" }],
	}),
	component: TermsPage,
});

function TermsPage() {
	return (
		<LegalPage title="Terms of Service" updated="15 August 2026">
			<p>
				These Terms of Service (“Terms”) govern access to and use of Mine
				Yapping, operated by Pöhinä Group Oy, business ID 3419352-5, Finland
				(“we”, “us”, “our”), including the website at mine-yapper.com, related
				APIs, and the free Fabric Minecraft client mod (together, the
				“Service”).
			</p>
			<p>
				By creating an account, downloading the mod, or using the Service, you
				agree to these Terms. If you do not agree, do not use the Service.
			</p>

			<h2>1. What the Service is</h2>
			<p>
				Mine Yapping lets you speak to Minecraft mobs through a client-side mod.
				Speech and text are processed by our servers and by AI providers so that
				mobs can reply in character. The mod and every one of its features are
				free, and every account receives a monthly allowance of free requests.
				You may optionally buy AI credits for requests beyond that allowance;
				credits unlock no features.
			</p>
			<p>
				Mine Yapping is{" "}
				<strong>
					not an official Minecraft product and is not approved by or associated
					with Mojang or Microsoft
				</strong>
				. Minecraft is a trademark of Mojang Synergies AB.
			</p>

			<h2>2. Eligibility and accounts</h2>
			<p>
				You must be able to form a binding contract in your country and comply
				with Minecraft’s own terms and age requirements. If you are a minor, you
				may use the Service only with permission from a parent or guardian who
				is responsible for your use.
			</p>
			<p>
				You are responsible for keeping your password and Minecraft API keys
				confidential, and for activity under your account. Contact{" "}
				<a href="mailto:joni@pohina.group">joni@pohina.group</a> if you believe
				your account or key was compromised.
			</p>

			<h2>3. Acceptable use</h2>
			<p>You agree not to:</p>
			<ul>
				<li>
					abuse, overload, or attempt to disrupt the Service or its providers;
				</li>
				<li>
					bypass rate limits, quotas, authentication, or security controls;
				</li>
				<li>
					use the Service to generate or share unlawful, harassing, or harmful
					content;
				</li>
				<li>
					misrepresent affiliation with Mojang, Microsoft, or other third
					parties;
				</li>
				<li>
					resell access, scrape the Service at scale, or reverse-engineer except
					as allowed by law.
				</li>
			</ul>
			<p>
				We may suspend or terminate accounts that violate these Terms or create
				operational, legal, or cost risk.
			</p>

			<h2>4. Usage allowances and bring-your-own keys</h2>
			<p>
				Free accounts receive a monthly request allowance. Twitch-linked
				accounts may receive a higher allowance as stated on the website. Unused
				allowance does not roll over. You may optionally supply your own OpenAI
				and ElevenLabs API keys; usage under those keys is billed by those
				providers to you, not by us.
			</p>
			<p>
				Allowances and features may change. We will try to give reasonable
				notice of material reductions on the website or by email when practical.
			</p>

			<h2>5. AI credits</h2>
			<p>
				AI credits are prepaid capacity on our AI pipeline: speech recognition,
				the language model that writes the reply, and the speech synthesis that
				speaks it. <strong>One credit is one request.</strong> Credits are sold
				in fixed packs at the prices shown on the website, they never expire,
				and they are spent only after your monthly free allowance is used up.
			</p>
			<p>
				Credits do not unlock features, raise your monthly free allowance, grant
				priority, or confer any advantage in Minecraft. Everything the mod does
				is available without them, and you may instead supply your own OpenAI
				and ElevenLabs keys under section 4 and use the Service without limit at
				no charge to us.
			</p>
			<p>
				So that a single request cannot consume unlimited capacity, each request
				is subject to technical limits on input audio length and spoken reply
				length. Purchases are processed by Polar, which acts as merchant of
				record and is the seller for the transaction. Prices shown include VAT.
				Refund and withdrawal rules are described in the{" "}
				<Link to="/refunds">Refund and Cancellation Policy</Link>.
			</p>

			<h2>6. Intellectual property</h2>
			<p>
				We own the Service software, branding, and related materials we provide,
				excluding third-party rights (including Minecraft) and content you
				submit. You retain rights to personalities and prompts you create, and
				grant us a license to host and process them to operate the Service.
			</p>

			<h2>7. AI output and no warranties</h2>
			<p>
				AI transcripts and replies can be inaccurate, offensive, or unexpected.
				The Service is provided “as is” without warranties of any kind,
				including availability, fitness for a particular purpose, or
				non-infringement. To the fullest extent permitted by law, we are not
				liable for indirect, incidental, or consequential damages, or for losses
				arising from AI output, provider outages, or Minecraft changes.
			</p>

			<h2>8. Privacy</h2>
			<p>
				How we process personal data is described in our{" "}
				<Link to="/privacy">Privacy Policy</Link>. By using the Service you
				acknowledge that microphone audio and conversation text are sent to us
				and to our AI subprocessors as described there.
			</p>

			<h2>9. Changes and contact</h2>
			<p>
				We may update these Terms by posting a revised version on this page.
				Continued use after changes take effect constitutes acceptance.
				Questions: <a href="mailto:joni@pohina.group">joni@pohina.group</a> ·
				Pöhinä Group Oy, business ID 3419352-5, Finland. Finnish law applies and
				you may always bring a dispute before the consumer dispute board
				(kuluttajariitalautakunta) or your local court.
			</p>
		</LegalPage>
	);
}
