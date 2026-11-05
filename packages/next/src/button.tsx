import "server-only";
import { FewchursButton as ClientButton, FewchursProvider } from "@fewchurs/react";
import type { FewchursButtonProps as ClientButtonProps } from "@fewchurs/react";
import { resolveApiPath } from "./config";
import type { DeviceIdResolver } from "./identity";

export interface FewchursButtonProps extends Omit<
  ClientButtonProps,
  "renderHeader" | "renderEmpty" | "renderFeature"
> {
  apiPath?: string;
  language?: string;
  deviceId?: DeviceIdResolver;
}

export async function FewchursButton({
  apiPath,
  language,
  deviceId,
  ...button
}: FewchursButtonProps): Promise<React.JSX.Element> {
  return (
    <FewchursProvider
      baseUrl={resolveApiPath(apiPath)}
      language={language}
      deviceId={deviceId ? await deviceId() : undefined}
    >
      <ClientButton {...button} />
    </FewchursProvider>
  );
}
