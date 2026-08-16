export const appName = "Mine Yapping";
export const docsRoute = "/docs";
export const docsImageRoute = "/og/docs";

export const gitConfig = {
  user: "JoniJuntto",
  repo: "mine-yapping",
  branch: "main",
};

/** Where the docs live in the repo, for "edit this page" links. */
export const docsContentPath = "apps/fumadocs/content/docs";

export const siteUrl = "https://mine-yapper.com";

export const modDownloadUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}/releases/latest/download/mineyapping.jar`;

export function encodeMarkdownUrl(slugs: string[], locale?: string) {
  const segments = [...slugs];
  if (segments.length === 0) {
    segments.push("index.md");
  } else {
    segments[segments.length - 1] += ".md";
  }

  return (
    "/" +
    [locale, ...docsRoute.split("/"), ...segments].filter(Boolean).join("/")
  );
}

/** @returns page slugs */
export function decodeMarkdownUrl(segments: string[]) {
  if (segments.length === 0) return [];

  const out = [...segments];
  out[out.length - 1] = out[out.length - 1].replace(/\.md$/, "");
  if (out.length === 1 && out[0] === "index") out.pop();
  return out;
}
