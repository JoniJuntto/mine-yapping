import { createFileRoute, Link } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";

import { baseOptions } from "@/lib/layout.shared";
import { modDownloadUrl, siteUrl } from "@/lib/shared";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <div className="flex flex-col flex-1 justify-center px-4 py-16 text-center max-w-2xl mx-auto">
        <h1 className="font-medium text-3xl mb-3">
          Talk to Minecraft mobs with your voice
        </h1>
        <p className="text-fd-muted-foreground mb-8">
          Mine Yapping is a client-only Fabric mod. Hold <kbd>V</kbd>, speak at
          a mob, and it answers in character — in chat and out loud. Works on
          any server, with only you having it installed.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            to="/docs/$"
            params={{ _splat: "quickstart" }}
            className="px-4 py-2 rounded-lg bg-fd-primary text-fd-primary-foreground font-medium text-sm"
          >
            Get started
          </Link>
          <a
            href={modDownloadUrl}
            className="px-4 py-2 rounded-lg border font-medium text-sm"
          >
            Download the mod
          </a>
          <a
            href={siteUrl}
            className="px-4 py-2 rounded-lg border font-medium text-sm"
          >
            Dashboard
          </a>
        </div>
        <p className="text-fd-muted-foreground text-xs mt-10">
          NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH
          MOJANG OR MICROSOFT.
        </p>
      </div>
    </HomeLayout>
  );
}
