import handler from "vinext/server/fetch-handler";
import { selfHostedFetch } from "../server/self-hosted.mjs";
import { runSummaries } from "../server/summaries.mjs";

export default {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    return selfHostedFetch(handler, request, env, ctx);
  },
  // Hourly; summaries go out at 8:00 in each workspace's time zone.
  scheduled(_controller: ScheduledController, env: Cloudflare.Env, ctx: ExecutionContext) {
    ctx.waitUntil(runSummaries(env).catch(() => console.warn("Summary run failed.")));
  },
};
