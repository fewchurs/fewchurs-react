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
    "We can't connect to this board right now. The owner of this site needs to check its setup.",
  errorWrongAppTitle: "Wrong platform",
  errorWrongAppDetail:
    "This board isn't set up for this site or app yet. Its owner needs to add it in Fewchurs.",
  errorTitle: "Something went wrong",
  errorDetail: "We couldn't load the requests. Please try again.",
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
