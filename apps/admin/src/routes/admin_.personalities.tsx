import { createFileRoute } from "@tanstack/react-router";
import { AdminNav, AppShell } from "../components/app-shell";
import { PersonalityManager } from "../components/personality-manager";
import { requireUser } from "../lib/route-guards";

export const Route = createFileRoute("/admin_/personalities")({
	beforeLoad: () => requireUser(true),
	component: AdminPersonalities,
});
function AdminPersonalities() {
	return (
		<AppShell>
			<AdminNav />
			<PersonalityManager admin />
		</AppShell>
	);
}
