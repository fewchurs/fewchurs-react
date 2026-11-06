export { createFewchursClient } from "./client/client";
export type { FetchLike, FewchursClient, FewchursClientOptions } from "./client/client";
export {
  DEFAULT_BASE_URL,
  DEFAULT_PAGE_SIZE,
  LIMITS,
  ROADMAP_STATUSES,
  SDK_HEADER,
  SDK_VERSION,
} from "./client/constants";
export { createDeviceId } from "./identity/deviceId";
export { featureKey, listKey } from "./store/keys";
export type { ListQuery } from "./store/keys";
// Types only: a server component describes seeded state without importing client runtime.
export type {
  CommentsState,
  FewchursEvent,
  FewchursEventName,
  ListState,
  LoadStatus,
  StoreState,
} from "./store/store";
export {
  errorFromResponse,
  networkError,
  NOT_CONFIGURED_MESSAGE,
  userMessage,
  validationError,
} from "./client/errors";
export type { FewchursError, Result } from "./client/errors";
export {
  normalizeComment,
  normalizeCommentPage,
  normalizeConfig,
  normalizeFeature,
  normalizeFeaturePage,
  normalizeStatus,
  normalizeVote,
} from "./client/normalize";
export { validateCommentInput, validateEmail, validateFeatureInput } from "./client/validate";
export type {
  Comment,
  CommentPage,
  CreateCommentInput,
  Feature,
  FeaturePage,
  FeatureSort,
  FeatureStatus,
  FewchursConfig,
  ListCommentsParams,
  ListFeaturesParams,
  SubmitFeatureInput,
} from "./types";
