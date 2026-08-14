import { redirect } from "@tanstack/react-router";
import { authClient } from "./auth-client";

export async function requireUser(admin = false) {
	if (typeof window === "undefined") return;
	const { data } = await authClient.getSession();
	if (!data) throw redirect({ to: "/login" });
	const role = (data.user as typeof data.user & { role?: string }).role;
	if (admin && !role?.split(",").includes("admin")) {
		throw redirect({ to: "/dashboard" });
	}
}

export async function redirectSignedIn() {
	if (typeof window === "undefined") return;
	if ((await authClient.getSession()).data) {
		throw redirect({ to: "/dashboard" });
	}
}
