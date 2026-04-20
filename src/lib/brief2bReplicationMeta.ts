import replicationJson from "./brief2b-replication-meta.json";

/** Single source for Brief 2B replication text — embedded in `analytics.json` as `brief2b.replication`. */
export const BRIEF2B_REPLICATION_META = replicationJson;

export type Brief2bReplicationMeta = typeof replicationJson;
