import { parseAiContextArgv } from "@kamod-ch/otok-ai/cli";

export async function runAiContextCommand(argv: string[]): Promise<number> {
  if (argv.includes("--help") || argv.includes("-h")) {
    const { AI_CONTEXT_HELP } = await import("@kamod-ch/otok-ai/cli");
    process.stdout.write(`${AI_CONTEXT_HELP}\n`);
    return 0;
  }

  const options = parseAiContextArgv(argv);
  const { runAiContextCommand: run } = await import("@kamod-ch/otok-ai/cli");
  return run(options);
}
