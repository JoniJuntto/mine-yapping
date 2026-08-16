# fumadocs

The Mine Yapping documentation site (Fumadocs on TanStack Start + Vite).

Pages live in `content/docs/*.mdx`; sidebar order and section separators are in
`content/docs/meta.json`. Site-wide strings (app name, GitHub repo, download URL) are in
`src/lib/shared.ts`.

```bash
bun run dev          # http://localhost:4000
bun run build
bun run start        # preview the build
bun run types:check
```
