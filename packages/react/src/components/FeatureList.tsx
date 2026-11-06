"use client";

import { ROADMAP_STATUSES } from "../client/constants";
import { isNotConfigured, isWrongApp, userMessage, type FewchursError } from "../client/errors";
import { useFeature } from "../hooks/useFeature";
import { useFeatures } from "../hooks/useFeatures";
import { useFollow } from "../hooks/useFollow";
import { useVote } from "../hooks/useVote";
import { useBoard, type BoardTab } from "./BoardContext";
import { FeatureCard } from "./FeatureCard";
import type { BoardLabels } from "./labels";
import { FeatureListSkeleton } from "./Skeleton";
import type { Feature, FeatureSort } from "../types";

function errorCopy(error: FewchursError, labels: BoardLabels): { title: string; detail: string } {
  if (isNotConfigured(error)) {
    return { title: labels.errorNotSetUpTitle, detail: labels.errorNotSetUpDetail };
  }
  if (error.code === "network") {
    return { title: labels.errorOfflineTitle, detail: labels.errorOfflineDetail };
  }
  if (isWrongApp(error)) {
    return {
      title: labels.errorWrongAppTitle,
      detail: labels.errorWrongAppDetail || userMessage(error),
    };
  }
  if (error.code === "invalid_key") {
    return { title: labels.errorInvalidKeyTitle, detail: labels.errorInvalidKeyDetail };
  }
  return {
    title: labels.errorTitle,
    detail: error.code === "server" ? labels.errorDetail : userMessage(error),
  };
}

export function FeatureList(): React.JSX.Element {
  const { initialFeatureId } = useBoard();

  // The deep-linked request sits above the list and is dropped from it, so a board opened on
  // one request shows it first without listing it twice.
  return (
    <>
      {initialFeatureId && <PinnedFeature featureId={initialFeatureId} />}
      <Listing excludeId={initialFeatureId} />
    </>
  );
}

function PinnedFeature({ featureId }: { featureId: string }): React.JSX.Element | null {
  const { cx } = useBoard();
  const { feature, isLoading, error } = useFeature(featureId);

  if (isLoading) return <FeatureListSkeleton rows={1} />;
  if (!feature && error) {
    return (
      <p className={cx("fw-error", "fw-pinned")} role="alert">
        {userMessage(error)}
      </p>
    );
  }
  if (!feature) return null;

  return (
    <div className={cx("fw-pinned")}>
      <ul className={cx("fw-list")}>
        <FeatureCard feature={feature} defaultCommentsOpen />
      </ul>
    </div>
  );
}

function Listing({ excludeId }: { excludeId?: string }): React.JSX.Element {
  const { tab, showDeclined, labels, cx, renderEmpty, pageSize } = useBoard();
  const sort: FeatureSort = tab === "roadmap" ? "top" : tab;
  const isRoadmap = tab === "roadmap";

  const { features, isLoading, isLoadingMore, error, hasMore, loadMore, refresh } = useFeatures({
    sort,
    status: isRoadmap ? ROADMAP_STATUSES : undefined,
    pageSize,
  });

  // Also filtered here: a server that does not support ?status= yet returns everything.
  const visible = features.filter((feature) => {
    if (feature.id === excludeId) return false;
    if (isRoadmap) return ROADMAP_STATUSES.includes(feature.status);
    return showDeclined || feature.status !== "declined";
  });

  if (error && visible.length === 0) {
    const { title, detail } = errorCopy(error, labels);
    return (
      <div className={cx("fw-empty")} role="alert">
        <p className={cx("fw-empty__title")}>{title}</p>
        <p className={cx("fw-empty__detail")}>{detail}</p>
        {!isNotConfigured(error) && (
          <button type="button" className={cx("fw-btn-text")} onClick={() => void refresh()}>
            {labels.retry}
          </button>
        )}
      </div>
    );
  }

  if (isLoading && visible.length === 0) {
    return <FeatureListSkeleton roadmap={isRoadmap} />;
  }

  if (visible.length === 0) {
    if (renderEmpty) return <>{renderEmpty()}</>;
    return (
      <div className={cx("fw-empty")}>
        <p className={cx("fw-empty__title")}>{labels.emptyTitle}</p>
        <p>{labels.emptyBody}</p>
      </div>
    );
  }

  return (
    <>
      {isRoadmap ? <RoadmapColumns features={visible} /> : <Rows features={visible} />}

      {hasMore && error && (
        <div className={cx("fw-pagination")} role="alert">
          <span>{labels.errorLoadMore}</span>
          <button type="button" className={cx("fw-btn-text")} onClick={() => void loadMore()}>
            {labels.retry}
          </button>
        </div>
      )}

      {hasMore && !error && (
        <div className={cx("fw-pagination")}>
          <button
            type="button"
            className={cx("fw-btn", "fw-btn--ghost")}
            disabled={isLoadingMore}
            onClick={() => void loadMore()}
          >
            {isLoadingMore ? labels.loading : labels.loadMore}
          </button>
        </div>
      )}
    </>
  );
}

function Rows({ features }: { features: Feature[] }): React.JSX.Element {
  const { cx } = useBoard();
  return (
    <ul className={cx("fw-list")}>
      {features.map((feature) => (
        <FeatureRow key={feature.id} feature={feature} />
      ))}
    </ul>
  );
}

function RoadmapColumns({ features }: { features: Feature[] }): React.JSX.Element {
  const { labels, cx } = useBoard();

  return (
    <div className={cx("fw-roadmap")}>
      {ROADMAP_STATUSES.map((status) => {
        const column = features.filter((feature) => feature.status === status);
        return (
          <section
            key={status}
            className={cx("fw-roadmap__column")}
            aria-label={labels.status[status]}
          >
            <h3 className={cx("fw-roadmap__heading")}>{labels.status[status]}</h3>
            {column.length === 0 ? (
              <p className={cx("fw-muted")}>—</p>
            ) : (
              <ul className={cx("fw-list")}>
                {column.map((feature) => (
                  <FeatureRow key={feature.id} feature={feature} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** Level 4: the host renders the row and drives it through the same actions the card uses. */
function FeatureRow({ feature }: { feature: Feature }): React.JSX.Element {
  const { renderFeature } = useBoard();
  if (!renderFeature) return <FeatureCard feature={feature} />;
  return <FeatureSlot feature={feature} />;
}

function FeatureSlot({ feature }: { feature: Feature }): React.JSX.Element {
  const { renderFeature } = useBoard();
  const { toggle } = useVote(feature.id);
  const { follow, unfollow } = useFollow(feature.id);

  return <>{renderFeature?.(feature, { toggleVote: toggle, follow, unfollow })}</>;
}

export { ROADMAP_STATUSES };
export type { BoardTab };
