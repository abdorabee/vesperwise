// Adapted from CopilotKit/OpenIntelligentUI, MIT License.

import type { SandboxFunctionMap } from "./sandbox-functions";

export interface SandboxInstance {
  iframe: HTMLIFrameElement;
  promise: Promise<unknown>;
  run: (code: string) => Promise<unknown>;
  destroy: () => void;
}

export interface WebsandboxModule {
  create: (
    localApi: SandboxFunctionMap,
    options: {
      frameContainer: HTMLElement;
      frameContent: string;
      allowAdditionalAttributes: string;
    },
  ) => SandboxInstance;
}

type WebsandboxNamespace = {
  default?: WebsandboxModule & { default?: WebsandboxModule };
};

export async function loadWebsandbox(): Promise<WebsandboxModule> {
  const mod = (await import("@jetbrains/websandbox")) as WebsandboxNamespace;
  return (mod.default?.default ?? mod.default) as WebsandboxModule;
}
