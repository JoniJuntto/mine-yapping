import { API_URL } from "./auth-client";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`${API_URL}/api${path}`, {
		...init,
		credentials: "include",
		headers: { "Content-Type": "application/json", ...init?.headers },
	});
	if (response.status === 401 && typeof window !== "undefined") {
		window.location.href = "/login";
	}
	if (!response.ok)
		throw new Error((await response.text()) || "Request failed");
	return response.status === 204 ? (undefined as T) : response.json();
}
