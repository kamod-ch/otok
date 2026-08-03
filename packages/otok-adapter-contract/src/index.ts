import { expect, it } from "vitest";
import {
  assertAdapterCapability,
  OTOK_ADAPTER_CAPABILITIES,
  resolveAdapter,
  type OtokAdapter,
  type OtokAdapterCapability,
  type OtokAdapterMiddleware,
  type OtokAdapterOutputDirs,
  type OtokAdapterPrerender,
  type OtokAdapterSsr,
  type OtokRuntime,
} from "@otok/config";

export interface AdapterContractExpectation {
  name: string;
  runtime: OtokRuntime;
  capabilities: OtokAdapterCapability[];
  outDirs: OtokAdapterOutputDirs;
  ssr?: OtokAdapterSsr;
  middleware?: OtokAdapterMiddleware;
  prerender?: OtokAdapterPrerender;
}

export interface AdapterContractOptions {
  adapter: OtokAdapter<any>;
  expected: AdapterContractExpectation;
  root?: string;
}

/** Validates that an adapter implements the typed OtokAdapter contract. */
export function assertAdapterContract(options: AdapterContractOptions): void {
  const root = options.root ?? "/tmp/otok-adapter-contract";
  const resolved = resolveAdapter(options.adapter, root);

  it("declares a unique adapter name", () => {
    expect(options.adapter.name).toBe(options.expected.name);
    expect(options.adapter.name.length).toBeGreaterThan(0);
  });

  it("declares a supported runtime", () => {
    expect(options.adapter.runtime).toBe(options.expected.runtime);
  });

  it("declares known capabilities only", () => {
    for (const capability of options.adapter.capabilities) {
      expect(OTOK_ADAPTER_CAPABILITIES).toContain(capability);
    }
  });

  it("exposes the expected capability set", () => {
    expect([...resolved!.capabilities].sort()).toEqual([...options.expected.capabilities].sort());
  });

  it("resolves output directories", () => {
    expect(resolved?.outDirs).toEqual(options.expected.outDirs);
  });

  it("implements build metadata", () => {
    expect(options.adapter.build).toBeDefined();
    expect(options.adapter.outputDirs).toBeTypeOf("function");
  });

  if (options.expected.ssr) {
    it("declares SSR support", () => {
      expect(options.adapter.ssr).toEqual(options.expected.ssr);
    });
  }

  if (options.expected.middleware) {
    it("declares middleware support", () => {
      expect(options.adapter.middleware).toEqual(options.expected.middleware);
    });
  }

  if (options.expected.prerender) {
    it("declares prerender support", () => {
      expect(options.adapter.prerender).toEqual(options.expected.prerender);
    });
  }
}

export function expectMissingCapability(
  adapter: OtokAdapter,
  capability: OtokAdapterCapability,
  reason: string,
): void {
  const resolved = resolveAdapter(adapter, "/tmp/otok");
  expect(resolved?.capabilities.has(capability)).toBe(false);
  expect(() => assertAdapterCapability(resolved, capability, reason)).toThrow(
    `Requires capability "${capability}"`,
  );
}
