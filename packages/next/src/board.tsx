import "server-only";
import { FewchursBoard as ClientBoard, FewchursProvider } from "@fewchurs/react";
import type { FewchursBoardProps as ClientBoardProps } from "@fewchurs/react";
import {
  featureKey,
  listKey,
  ROADMAP_STATUSES,
  type FeatureSort,
  type StoreState,
} from "@fewchurs/react/core";
import { resolveApiPath, serverClient } from "./config";
import { resolveDeviceId, type DeviceIdResolver } from "./identity";

/** Function props cannot cross the server/client boundary — compose in your own client file. */
type SerializableBoardProps = Omit<
  ClientBoardProps,
  "renderHeader" | "renderEmpty" | "renderFeature" | "children"
>;

export interface FewchursBoardProps extends SerializableBoardProps {
  /** Defaults to `process.env.FEWCHURS_API_KEY`. Never reaches the browser. */
  apiKey?: string;
  baseUrl?: string;
  /** Where your route handler is mounted. Defaults to `/api/fewchurs`. */
  apiPath?: string;
  language?: string;
  /** The domain the API key is checked against. Defaults to `FEWCHURS_APP_ID`, then your site's host. */
  appId?: string;
  deviceId?: DeviceIdResolver;
}

export async function FewchursBoard({
  apiKey,
  baseUrl,
  apiPath,
  language,
  appId,
  deviceId: deviceIdOption,
  ...board
}: FewchursBoardProps): Promise<React.JSX.Element> {
  const deviceId = await resolveDeviceId(deviceIdOption);
  const client = await serverClient(deviceId, { apiKey, baseUrl, language, appId });

  const tab = board.defaultTab ?? board.tabs?.[0] ?? "top";
  const sort: FeatureSort = tab === "roadmap" ? "top" : tab;
  const status = tab === "roadmap" ? ROADMAP_STATUSES : undefined;
  const pageSize = board.pageSize ?? 20;

  const [config, page, pinned] = await Promise.all([
    client.getConfig(),
    client.listFeatures({ sort, status, limit: pageSize }),
    board.initialFeatureId ? client.getFeature(board.initialFeatureId) : null,
  ]);

  // Seeded under the same key the client hook will ask for, so the first paint is the
  // rendered HTML and no second request goes out just to fetch what is already there.
  const lists: StoreState["lists"] = {};
  if (page.ok) {
    lists[listKey({ sort, status })] = {
      features: page.data.features,
      cursor: page.data.nextCursor,
      status: "ready",
      error: null,
    };
  }
  // A deep-linked request is rendered on the server too, so the link lands on real content.
  if (board.initialFeatureId && pinned?.ok) {
    lists[featureKey(board.initialFeatureId)] = {
      features: [pinned.data],
      cursor: null,
      status: "ready",
      error: null,
    };
  }

  const initialState: Partial<StoreState> = {
    config: config.ok ? config.data : null,
    lists,
  };

  return (
    <FewchursProvider
      baseUrl={resolveApiPath(apiPath)}
      deviceId={deviceId}
      pageSize={pageSize}
      initialState={initialState}
    >
      <ClientBoard {...board} />
    </FewchursProvider>
  );
}
