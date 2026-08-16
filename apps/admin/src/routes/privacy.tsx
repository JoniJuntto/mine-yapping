import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "../components/legal-page";

export const Route = createFileRoute("/privacy")({
	head: () => ({
		meta: [{ title: "Privacy Policy · Mine Yapping" }],
	}),
	component: PrivacyPage,
});

function PrivacyPage() {
	return (
		<LegalPage title="Privacy Policy" updated="15 August 2026">
			<p>
				This Privacy Policy explains how Pöhinä Group Oy (“we”, “us”, “our”)
				collects and uses personal data when you use Mine Yapping at
				mine-yapper.com, related APIs, and the Fabric client mod (the
				“Service”).
			</p>
			<p>
				Controller: Pöhinä Group Oy (business ID 3419352-5, Finland). Contact:{" "}
				<a href="mailto:joni@pohina.group">joni@pohina.group</a>.
			</p>

			<h2>1. Data we collect</h2>
			<ul>
				<li>
					<strong>Account data:</strong> name, email address, password hash (if
					you sign up with email), role/ban state, and profile fields you
					provide.
				</li>
				<li>
					<strong>Authentication data:</strong> session tokens, IP address, user
					agent, and OAuth tokens if you sign in with Twitch.
				</li>
				<li>
					<strong>API keys:</strong> Minecraft API keys you create for the mod,
					and optional encrypted OpenAI / ElevenLabs keys if you bring your own.
				</li>
				<li>
					<strong>Conversation inputs:</strong> microphone audio and/or text you
					send while talking to a mob, plus limited game context (for example
					mob type/name, player name, dimension, health).
				</li>
				<li>
					<strong>Usage metrics:</strong> whether a request succeeded, billing
					mode, input type, token/character/audio duration counters, and
					latency. We do not store conversation audio or transcript content in
					our database.
				</li>
				<li>
					<strong>Content you create:</strong> mob personalities and prompts.
				</li>
				<li>
					<strong>Purchase data:</strong> Polar customer/order identifiers, the
					credit pack bought, amount, currency, and optional public nickname
					preference.
				</li>
			</ul>

			<h2>2. How conversation audio and text are processed</h2>
			<p>
				When you hold the talk key or otherwise send a conversation request, the
				mod sends audio or text to our servers. We process that input in memory
				to:
			</p>
			<ol>
				<li>
					transcribe speech with <strong>OpenAI</strong> (speech-to-text);
				</li>
				<li>
					generate a reply with <strong>OpenAI</strong> (language model), using
					your transcript, game context, and a short ephemeral conversation
					memory held only in the running server process;
				</li>
				<li>
					synthesize speech with <strong>ElevenLabs</strong> (text-to-speech)
					and stream audio back to the mod.
				</li>
			</ol>
			<p>
				We do <strong>not</strong> write microphone audio or conversation
				transcripts to our database. Ephemeral in-memory conversation history is
				discarded when the process restarts and is limited in size. Server logs
				are intended to exclude audio, transcripts, and secrets.
			</p>
			<p>
				OpenAI and ElevenLabs act as subprocessors. If you use bring-your-own
				keys, your audio and text are sent to those providers using your keys
				instead of ours.
			</p>

			<h2>3. Why we process data</h2>
			<ul>
				<li>to provide accounts, authentication, and the Minecraft mod API;</li>
				<li>to run speech and dialogue features through AI providers;</li>
				<li>to enforce monthly allowances and estimate shared API cost;</li>
				<li>to sell and grant AI credits via Polar;</li>
				<li>to secure the Service, prevent abuse, and provide support;</li>
				<li>to meet legal obligations where applicable.</li>
			</ul>
			<p>
				Where GDPR applies, we rely on performance of a contract (providing the
				Service you request), legitimate interests (security, abuse prevention,
				service improvement), and consent or contract where you choose optional
				features such as Twitch sign-in, public donor nicknames, or
				bring-your-own keys.
			</p>

			<h2>4. Subprocessors and international transfers</h2>
			<p>
				We use third parties that may process personal data outside your
				country, including outside the EEA/UK. Those providers apply their own
				safeguards (such as standard contractual clauses) as described in their
				policies:
			</p>
			<ul>
				<li>
					<strong>OpenAI</strong> — speech-to-text and language model processing
					of conversation audio/text;
				</li>
				<li>
					<strong>ElevenLabs</strong> — text-to-speech and voice metadata;
				</li>
				<li>
					<strong>Polar</strong> — merchant of record for credit purchases:
					checkout, VAT, receipts, and customer records (a Polar customer may be
					created when you sign up);
				</li>
				<li>
					<strong>Twitch</strong> — if you choose Twitch sign-in;
				</li>
				<li>
					<strong>UpCloud</strong> — application hosting and managed PostgreSQL
					(including backups).
				</li>
			</ul>
			<p>
				We do not sell personal data. Audio and text leave our systems only as
				needed to operate the AI and payment features above.
			</p>

			<h2>5. Retention</h2>
			<ul>
				<li>
					<strong>
						Account, session, API key, personality, and usage metric data
					</strong>{" "}
					are kept while your account is active. We do not currently run
					automated purge jobs for older usage metrics; monthly quotas use
					current-month rows, but historical metric rows may remain until
					deleted with the account or by an operational cleanup.
				</li>
				<li>
					<strong>Conversation audio and transcripts</strong> are not retained
					in our database; ephemeral memory lasts only for the life of the
					server process (and is capped).
				</li>
				<li>
					<strong>Purchase records</strong> (order identifiers, amounts,
					optional nicknames) are retained for <strong>six years</strong> from
					the end of the accounting period, as Finnish bookkeeping law requires,
					even if an account is later removed. Corresponding records also exist
					at Polar.
				</li>
				<li>
					<strong>Database backups</strong> follow our host’s backup retention
					and may temporarily contain deleted data until those backups expire.
				</li>
			</ul>

			<h2>6. Your rights and choices</h2>
			<p>
				Depending on your location, you may have rights to access, correct,
				delete, or restrict processing of your personal data, to object to
				certain processing, and to data portability. You can:
			</p>
			<ul>
				<li>update your name in the account dashboard;</li>
				<li>
					revoke Minecraft API keys and delete stored bring-your-own keys;
				</li>
				<li>sign out to end the current session;</li>
				<li>
					email <a href="mailto:joni@pohina.group">joni@pohina.group</a> to
					request account deletion or other privacy requests.
				</li>
			</ul>
			<p>
				Self-service account deletion is not yet available in the product UI.
				When you request deletion, we will delete or anonymize account data we
				control as described above, except where we must retain records (for
				example purchase accounting) or where data lives with a processor you
				also have a relationship with (Polar, Twitch, or your own AI provider
				accounts).
			</p>
			<p>
				You may lodge a complaint with your local data protection authority. In
				Finland that is the Office of the Data Protection Ombudsman
				(tietosuoja.fi).
			</p>

			<h2>7. Children</h2>
			<p>
				Minecraft is played by many minors. The Service is not directed at
				children under 13 (or the higher age required in your country without
				parental consent). Parents or guardians who allow a minor to use the
				Service are responsible for supervising that use and may contact us to
				request deletion of the minor’s account data.
			</p>

			<h2>8. Security</h2>
			<p>
				We use industry-standard measures such as TLS in transit, hashed
				passwords, hashed API keys, and encryption for stored bring-your-own
				provider keys. No method of transmission or storage is completely
				secure.
			</p>

			<h2>9. Changes</h2>
			<p>
				We may update this Privacy Policy by posting a revised version on this
				page. For material changes affecting how we process conversation audio
				or text, we will update this notice before enabling those flows in a
				materially different way.
			</p>

			<h2>10. Contact</h2>
			<p>
				Privacy and support:{" "}
				<a href="mailto:joni@pohina.group">joni@pohina.group</a> · Pöhinä Group
				Oy.
			</p>
		</LegalPage>
	);
}
