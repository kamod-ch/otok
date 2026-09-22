/** Marks the server-rendered page region replaced during soft navigation. */
export const OTOK_PAGE_ATTR = "data-otok-page";

/** Marks a layout region updated from the fetched document during soft navigation. */
export const OTOK_SWAP_ATTR = "data-otok-swap";

/** Opts a link out of soft navigation. */
export const OTOK_NO_NAV_ATTR = "data-otok-no-nav";

/** Marks head elements synced during soft navigation. */
export const OTOK_HEAD_ATTR = "data-otok-head";

export const OTOK_CANCEL_HYDRATION = "otok:cancel-hydration";

export const OTOK_HISTORY_STATE_KEY = "otokSoftNav";

/** Progressive form submission state (`idle` | `submitting`). */
export const OTOK_FORM_STATE_ATTR = "data-otok-form-state";

/** Inline alert region for progressive form network/abort errors. */
export const OTOK_FORM_ERROR_ATTR = "data-otok-form-error";

/** Retries reuse the same idempotency key for this form element. */
export const OTOK_FORM_IDEMPOTENCY_ATTR = "data-otok-idempotency-key";
