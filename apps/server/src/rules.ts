export const hasRole = (role: string | null | undefined, expected: string) =>
	role?.split(",").includes(expected) ?? false;

export const quotaAllowed = (requests: number, limit: number) =>
	requests < limit;
