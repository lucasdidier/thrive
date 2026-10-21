import handler from "vinext/server/fetch-handler";
import { selfHostedFetch } from "../server/self-hosted.mjs";

export default {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    return selfHostedFetch(handler, request, env, ctx);
  },
};
