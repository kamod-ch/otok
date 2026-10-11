import worker, * as OTHER_EXPORTS from "/home/watzak/master/kamod/otok/examples/realtime-cloudflare/src/worker.ts";
import * as __MIDDLEWARE_0__ from "/home/watzak/master/kamod/otok/node_modules/.pnpm/wrangler@4.149.0_@cloudflare+workers-types@5.20261010.1_@types+node@26.6.3/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts";
import * as __MIDDLEWARE_1__ from "/home/watzak/master/kamod/otok/node_modules/.pnpm/wrangler@4.149.0_@cloudflare+workers-types@5.20261010.1_@types+node@26.6.3/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts";

export * from "/home/watzak/master/kamod/otok/examples/realtime-cloudflare/src/worker.ts";
const MIDDLEWARE_TEST_INJECT = "__INJECT_FOR_TESTING_WRANGLER_MIDDLEWARE__";
export const __INTERNAL_WRANGLER_MIDDLEWARE__ = [__MIDDLEWARE_0__.default, __MIDDLEWARE_1__.default];
export default worker;
