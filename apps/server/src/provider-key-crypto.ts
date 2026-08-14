const algorithm = "AES-GCM";

const encryptionKey = async (secret: string, usage: "encrypt" | "decrypt") =>
	crypto.subtle.importKey(
		"raw",
		await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)),
		algorithm,
		false,
		[usage],
	);

export async function encryptApiKey(value: string, secret: string) {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const encrypted = await crypto.subtle.encrypt(
		{ name: algorithm, iv },
		await encryptionKey(secret, "encrypt"),
		new TextEncoder().encode(value),
	);
	return `v1:${Buffer.from(iv).toString("base64url")}:${Buffer.from(encrypted).toString("base64url")}`;
}

export async function decryptApiKey(value: string, secret: string) {
	const [version, encodedIv, encodedKey] = value.split(":");
	if (version !== "v1" || !encodedIv || !encodedKey)
		throw new Error("Invalid encrypted API key");
	const decrypted = await crypto.subtle.decrypt(
		{ name: algorithm, iv: Buffer.from(encodedIv, "base64url") },
		await encryptionKey(secret, "decrypt"),
		Buffer.from(encodedKey, "base64url"),
	);
	return new TextDecoder().decode(decrypted);
}
