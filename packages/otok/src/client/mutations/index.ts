export { mutationStore } from "./store.js";
export type { MutationEntry, OptimisticPatch, LoaderCacheEntry } from "./store.js";
export { submitMutation, revalidateLoader, readCsrfToken } from "./fetch.js";
export type { SubmitContext } from "./fetch.js";
export {
  useAction,
  useFetcher,
  useRevalidator,
  useNavigationBlocker,
  useLoaderData,
  setMutationRegistry,
} from "./hooks.js";
export type {
  UseActionOptions,
  ActionHandle,
  FetcherHandle,
  FetcherFormProps,
  BlockerOptions,
} from "./hooks.js";
export { LoadingBoundary, ErrorBoundary } from "./boundaries.js";
export type { LoadingBoundaryProps, ErrorBoundaryProps } from "./boundaries.js";
export {
  saveScrollPosition,
  restoreScrollPosition,
  saveFocusSelector,
  restoreFocus,
  withViewTransition,
  patchHistoryScroll,
} from "./scroll.js";

export type {
  FetcherState,
  OtokDataResponse,
  MutationSubmitOptions,
  ActionDescriptor,
} from "../../shared/mutations.js";

export {
  OTOK_DATA_ACCEPT,
  OTOK_FETCHER_ATTR,
  createIdempotencyKey,
} from "../../shared/mutations.js";
