export function donorMetadata(metadata: Record<string, unknown>) {
	const nickname = String(metadata.nickname ?? "")
		.trim()
		.slice(0, 50);
	return {
		nickname: nickname || null,
		showNickname: metadata.showNickname === true && !!nickname,
	};
}
