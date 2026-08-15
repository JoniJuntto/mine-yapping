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
		<LegalPage title="Refund and Cancellation Policy" updated="15 August 2026">
			<p>
				This policy explains how optional donations to Mine Yapping work.
				Operator: Pöhinä Group Oy. Support:{" "}
				<a href="mailto:joni@pohina.group">joni@pohina.group</a>.
			</p>

			<h2>1. What you are paying for</h2>
			<p>
				Mine Yapping’s mod and features are free. Donations are voluntary
				one-time contributions processed by Polar. You may donate any amount
				from €1 upward. Donations do not unlock features, increase monthly
				usage, or create a paid subscription.
			</p>

			<h2>2. No refunds</h2>
			<p>
				Because donations are voluntary gifts that do not purchase a product,
				service tier, or usage credits,{" "}
				<strong>all donations are final and non-refundable</strong> once payment
				succeeds, except where mandatory consumer law requires otherwise.
			</p>
			<p>
				If Polar or your payment provider reverses a payment (for example a
				chargeback), that does not grant Service benefits—donations never
				granted any—and we may investigate abuse.
			</p>

			<h2>3. Cancellation before payment</h2>
			<p>
				You can abandon Polar checkout at any time before completing payment. No
				charge is made until checkout completes successfully.
			</p>
			<p>
				There is no recurring donation subscription to cancel in Mine Yapping.
				If you set up a recurring arrangement elsewhere, manage or cancel it
				with that provider.
			</p>

			<h2>4. Failed or canceled checkouts</h2>
			<p>
				Failed, canceled, or abandoned checkouts do not create a donation and do
				not change your account features or usage allowance.
			</p>

			<h2>5. Receipts and disputes</h2>
			<p>
				Payment receipts and tax documents (if any) are issued through Polar.
				For donation questions, email{" "}
				<a href="mailto:joni@pohina.group">joni@pohina.group</a> with the email
				used at checkout and approximate date/amount. We will check our records
				and Polar’s.
			</p>

			<h2>6. Related policies</h2>
			<p>
				See also the <Link to="/terms">Terms of Service</Link> and{" "}
				<Link to="/privacy">Privacy Policy</Link>.
			</p>
		</LegalPage>
	);
}
