import type { DiscussionsConfig } from "@kamod-ch/otok-discussions";
import { parseDiscussionsConfig } from "@kamod-ch/otok-discussions";
import { createMemoryDiscussionAdapter } from "@kamod-ch/otok-discussions/adapters/memory";
import { createTestProviders } from "@kamod-ch/otok-discussions/testing";

const deps = createTestProviders();
createMemoryDiscussionAdapter({ deps });
const config: DiscussionsConfig = parseDiscussionsConfig({ pagination: { defaultPageSize: 10 } });
void config;
