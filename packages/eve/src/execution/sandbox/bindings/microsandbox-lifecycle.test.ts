import { beforeEach, describe, expect, it, vi } from "vitest";

import { prewarmMicrosandboxTemplate } from "#execution/sandbox/bindings/microsandbox-lifecycle.js";
import type { SandboxProviderPrepareContext } from "#shared/sandbox-provider.js";

const mocks = vi.hoisted(() => ({
  buildSandboxSession: vi.fn(() => ({})),
  createLoggingSandboxSession: vi.fn((session: unknown) => session),
  createPreparedMicrosandbox: vi.fn(),
  createProviderName: vi.fn((prefix: string, key: string) => `${prefix}-${key}`),
  doesPathExist: vi.fn(async () => false),
  hydrateSandboxProviderResources: vi.fn(async () => {}),
  loadMicrosandboxModule: vi.fn(async () => ({})),
  mkdir: vi.fn(async () => undefined),
  readTemplateMetadata: vi.fn(async () => null),
  removePersisted: vi.fn(async () => undefined),
  removeSnapshotIfExists: vi.fn(async () => undefined),
  rename: vi.fn(async () => undefined),
  rm: vi.fn(async () => undefined),
  snapshotExists: vi.fn(async () => false),
  stopAndSnapshot: vi.fn(async () => undefined),
  touchDirectory: vi.fn(async () => undefined),
  writeTemplateMetadata: vi.fn(async () => undefined),
}));

vi.mock("node:fs/promises", () => ({
  mkdir: mocks.mkdir,
  rename: mocks.rename,
  rm: mocks.rm,
}));

vi.mock("#execution/sandbox/bindings/immutable-resources.js", () => ({
  hydrateSandboxProviderResources: mocks.hydrateSandboxProviderResources,
  prepareImmutableResources: vi.fn(async () => undefined),
}));

vi.mock("#execution/sandbox/bindings/docker-cli.js", () => ({
  assertDockerDaemonAvailable: vi.fn(async () => undefined),
  createDockerCli: vi.fn(),
}));

vi.mock("#execution/sandbox/dockerfile.js", () => ({
  buildSandboxDockerfile: vi.fn(async () => undefined),
  dockerfileImageReference: vi.fn(),
  publishDockerImageForMicrosandbox: vi.fn(async () => "image"),
}));

vi.mock("#execution/sandbox/bindings/local-provider-utils.js", () => ({
  createFileBackedInternalSandboxSession: vi.fn(),
  touchDirectory: mocks.touchDirectory,
}));

vi.mock("#execution/sandbox/bindings/microsandbox-metadata.js", () => ({
  MICROSANDBOX_METADATA_VERSION: 2,
  readSessionMetadata: vi.fn(async () => null),
  readTemplateMetadata: mocks.readTemplateMetadata,
  resolveMicrosandboxMetadataPath: vi.fn((path: string) => `${path}/metadata.json`),
  writeTemplateMetadata: mocks.writeTemplateMetadata,
}));

vi.mock("#execution/sandbox/bindings/microsandbox-runtime.js", () => ({
  connectMicrosandbox: vi.fn(),
  createPreparedMicrosandbox: mocks.createPreparedMicrosandbox,
  createProviderName: mocks.createProviderName,
  createStableHash: vi.fn(() => "stable-hash"),
  doesPathExist: mocks.doesPathExist,
  loadMicrosandboxModule: mocks.loadMicrosandboxModule,
  removeSnapshotIfExists: mocks.removeSnapshotIfExists,
  sandboxExists: vi.fn(async () => false),
  snapshotExists: mocks.snapshotExists,
}));

vi.mock("#execution/sandbox/bindings/microsandbox-templates.js", () => ({
  resolveMicrosandboxSessionRootPath: vi.fn(
    (cache: string, key: string) => `${cache}/sessions/${key}`,
  ),
  resolveMicrosandboxTemplateRootPath: vi.fn(
    (cache: string, key: string) => `${cache}/templates/${key}`,
  ),
}));

vi.mock("#execution/sandbox/logging-session.js", () => ({
  createLoggingSandboxSession: mocks.createLoggingSandboxSession,
}));

vi.mock("#execution/sandbox/development-run.js", () => ({
  withDevelopmentSandboxMetadataPathTag: vi.fn((tags: unknown) => tags),
}));

vi.mock("#execution/sandbox/session.js", () => ({
  buildSandboxSession: mocks.buildSandboxSession,
}));

describe("prewarmMicrosandboxTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readTemplateMetadata.mockResolvedValue(null);
    mocks.snapshotExists.mockResolvedValue(false);
    mocks.createPreparedMicrosandbox.mockResolvedValue({
      removePersisted: mocks.removePersisted,
      setNetworkPolicy: vi.fn(async () => undefined),
      stopAndSnapshot: mocks.stopAndSnapshot,
    });
  });

  it("shares one preparation when identical templates are requested concurrently", async () => {
    const input = createInput();

    const [first, second] = await Promise.all([
      prewarmMicrosandboxTemplate(input),
      prewarmMicrosandboxTemplate(input),
    ]);

    expect(first).toEqual(second);
    expect(mocks.createPreparedMicrosandbox).toHaveBeenCalledOnce();
    expect(mocks.stopAndSnapshot).toHaveBeenCalledOnce();
  });
});

function createInput(): {
  readonly context: SandboxProviderPrepareContext;
  readonly options: never;
  readonly optionsHash: string;
  readonly providerName: string;
  readonly templateKey: string;
} {
  return {
    context: {
      files: {} as never,
      host: {} as never,
      resources: { source: { kind: "none" } },
      sourceRevision: "source",
      storagePath: "/cache",
    },
    options: {} as never,
    optionsHash: "options",
    providerName: "microsandbox",
    templateKey: "same-template",
  };
}
