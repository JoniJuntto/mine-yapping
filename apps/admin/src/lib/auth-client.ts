import { apiKeyClient } from "@better-auth/api-key/client";
import { polarClient } from "@polar-sh/better-auth/client";
import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:31415";
export const authClient = createAuthClient({
	baseURL: API_URL,
	plugins: [adminClient(), apiKeyClient(), polarClient()],
});
