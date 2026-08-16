import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "../components/legal-page";

export const Route = createFileRoute("/refunds")({
	head: () => ({
		meta: [{ title: "Refund and Cancellation Policy · Mine Yapping" }],
	}),
	component: RefundsPage,
});

function RefundsPage() {
	return (
		<LegalPage title="Refund and Cancellation Policy" updated="16 August 2026">
			<p>
				This policy explains your cancellation and refund rights when you buy AI
				credits for Mine Yapping. Seller and operator: Pöhinä Group Oy, business
				ID 3419352-5, Finland. Support:{" "}
				<a href="mailto:joni@pohina.group">joni@pohina.group</a>. Payments are
				processed by Polar as merchant of record.
			</p>

			<h2>1. What you are buying</h2>
			<p>
				AI credits are prepaid requests on our AI pipeline. One credit is one
				request. Packs are sold at fixed prices, VAT included for EU customers,
				credits never expire, and they are spent only once your monthly free
				allowance runs out. The mod and all of its features are free with or
				without credits.
			</p>

			<h2>2. Your 14-day right of withdrawal</h2>
			<p>
				As a consumer buying at a distance you have a{" "}
				<strong>14-day right of withdrawal</strong> under chapter 6 of the
				Finnish Consumer Protection Act, starting the day the credits are
				delivered.
			</p>
			<p>
				Credits are digital content delivered immediately, so at checkout we ask
				you to confirm two things: that you want delivery to begin at once, and
				that you understand you lose the right of withdrawal for credits you
				have actually used. That confirmation is required before payment.
			</p>

			<h2>3. Refunds on unused credits</h2>
			<p>
				Within 14 days of purchase we refund{" "}
				<strong>any credits from that purchase you have not yet spent</strong>,
				pro rata at the price you paid. Used credits are not refundable, because
				the AI capacity behind them has already been bought and consumed on your
				behalf.
			</p>
			<p>
				Example: you buy a 1000-credit pack, spend 200, and ask to withdraw on
				day nine. We refund 80% of what you paid and remove the remaining 800
				credits from your balance.
			</p>
			<p>
				To withdraw, email{" "}
				<a href="mailto:joni@pohina.group">joni@pohina.group</a> from your
				account email within 14 days. No form or reason is needed. We refund via
				Polar to the original payment method, without undue delay and within 14
				days of receiving your request.
			</p>

			<h2>4. After 14 days</h2>
			<p>
				Credits do not expire, so there is nothing to cancel and no subscription
				running in the background. Outside the withdrawal period we do not
				refund unused credits as a matter of course, but if something has gone
				wrong — a duplicate charge, credits that never arrived, a failed service
				— email us and we will put it right. Your statutory rights in cases of
				faulty performance are unaffected by anything in this policy.
			</p>

			<h2>5. Failed and abandoned checkouts</h2>
			<p>
				No charge is made until checkout completes. A failed, cancelled, or
				abandoned checkout grants no credits and changes nothing on your
				account. If a payment is later reversed, for example by chargeback, we
				may remove the corresponding unused credits.
			</p>

			<h2>6. Requests that fail</h2>
			<p>
				A credit is spent only on a request we complete. If a request fails on
				our side, the credit is returned to your balance automatically — you do
				not need to contact us.
			</p>

			<h2>7. Receipts and disputes</h2>
			<p>
				Receipts and VAT documentation are issued by Polar as merchant of
				record. For any question about a purchase, email{" "}
				<a href="mailto:joni@pohina.group">joni@pohina.group</a> with the email
				used at checkout and the approximate date and amount. If we cannot
				agree, you may take the matter to the Finnish consumer dispute board
				(kuluttajariitalautakunta) or use the EU online dispute resolution
				platform.
			</p>

			<h2>8. Related policies</h2>
			<p>
				See also the <Link to="/terms">Terms of Service</Link> and{" "}
				<Link to="/privacy">Privacy Policy</Link>.
			</p>
		</LegalPage>
	);
}
