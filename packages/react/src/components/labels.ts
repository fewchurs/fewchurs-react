import type { FeatureStatus } from "../types";

export interface BoardLabels {
  title: string;
  tabTop: string;
  tabNew: string;
  tabRoadmap: string;
  newRequest: string;
  cancel: string;
  submit: string;
  submitting: string;
  submitted: string;
  fieldTitle: string;
  fieldTitlePlaceholder: string;
  fieldDescription: string;
  fieldDescriptionPlaceholder: string;
  fieldEmail: string;
  fieldEmailHint: string;
  fieldName: string;
  emptyTitle: string;
  emptyBody: string;
  loading: string;
  loadMore: string;
  retry: string;
  errorInvalidKeyTitle: string;
  errorInvalidKeyDetail: string;
  errorWrongAppTitle: string;
  errorWrongAppDetail: string;
  errorTitle: string;
  errorDetail: string;
  errorOfflineTitle: string;
  errorOfflineDetail: string;
  errorNotSetUpTitle: string;
  errorNotSetUpDetail: string;
  errorLoadMore: string;
  errorComments: string;
  fieldTitleTooShort: string;
  fieldEmailInvalid: string;
  comments: string;
  commentPlaceholder: string;
  postComment: string;
  noComments: string;
  follow: string;
  following: string;
  followPlaceholder: string;
  developer: string;
  poweredBy: string;
  upvote: string;
  status: Record<FeatureStatus, string>;
}

export const DEFAULT_LABELS: BoardLabels = {
  title: "Feature requests",
  tabTop: "Top",
  tabNew: "New",
  tabRoadmap: "Roadmap",
  newRequest: "New request",
  cancel: "Cancel",
  submit: "Submit request",
  submitting: "Submitting…",
  submitted: "Thanks — your request is in.",
  fieldTitle: "Title",
  fieldTitlePlaceholder: "Add dark mode",
  fieldDescription: "Details",
  fieldDescriptionPlaceholder: "What would this let you do?",
  fieldEmail: "Email",
  fieldEmailHint: "Only used to tell you when this ships.",
  fieldName: "Your name",
  emptyTitle: "No feature requests yet",
  emptyBody: "Be the first to suggest something.",
  loading: "Loading…",
  loadMore: "Load more",
  retry: "Try again",
  errorInvalidKeyTitle: "Invalid API key",
  errorInvalidKeyDetail:
    "Copy the key from your Fewchurs dashboard (Apps → API keys) and pass it to FewchursProvider, or set FEWCHURS_API_KEY on your server.",
  errorWrongAppTitle: "Invalid API key",
  errorWrongAppDetail: "",
  errorTitle: "Couldn't load requests",
  errorDetail: "Something went wrong. Try again.",
  errorOfflineTitle: "You're offline",
  errorOfflineDetail: "Check your connection and try again.",
  errorNotSetUpTitle: "Fewchurs isn't set up",
  errorNotSetUpDetail: "Pass apiKey to FewchursProvider, or set FEWCHURS_API_KEY on your server.",
  errorLoadMore: "Couldn't load more.",
  errorComments: "Couldn't load comments.",
  fieldTitleTooShort: "At least 3 characters.",
  fieldEmailInvalid: "Enter a valid email address.",
  comments: "Comments",
  commentPlaceholder: "Add a comment",
  postComment: "Post",
  noComments: "No comments yet.",
  follow: "Notify me",
  following: "You'll be notified",
  followPlaceholder: "you@example.com",
  developer: "Team",
  poweredBy: "Powered by Fewchurs",
  upvote: "Upvote",
  status: {
    open: "Open",
    planned: "Planned",
    in_progress: "In progress",
    done: "Done",
    declined: "Declined",
    unknown: "Open",
  },
};

export function mergeLabels(overrides?: Partial<BoardLabels>): BoardLabels {
  if (!overrides) return DEFAULT_LABELS;
  return {
    ...DEFAULT_LABELS,
    ...overrides,
    status: { ...DEFAULT_LABELS.status, ...overrides.status },
  };
}
