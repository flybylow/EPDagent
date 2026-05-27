/** One pipeline step per HTTP request — stays under serverless time limits. */
export const EXTRACT_CHUNK_SIZE = 1;

/** Safety cap on chained chunk requests per user click. */
export const EXTRACT_CHUNK_MAX_ROUNDS = 64;

/** Stop chaining when pending count is unchanged this many completed chunks (not timeouts). */
export const EXTRACT_CHUNK_MAX_STALE_ROUNDS = 3;

/** Max consecutive stream timeouts on the same pending step before giving up. */
export const EXTRACT_CHUNK_MAX_TIMEOUT_ROUNDS = 12;
