import handler from "vinext/server/fetch-handler";
import { selfHostedFetch } from "../server/self-hosted.mjs";
import { runScheduled } from "../server/scheduled.mjs";

export default {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    return selfHostedFetch(handler, request, env, ctx);
  },
  // Hourly: summaries at 8:00 in each workspace's time zone, invite emails, nightly backup.
  scheduled(_controller: ScheduledController, env: Cloudflare.Env, ctx: ExecutionContext) {
    ctx.waitUntil(runScheduled(env));
  },
};
