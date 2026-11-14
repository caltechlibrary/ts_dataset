export { Dataset, DatasetApiClient } from "./dataset.ts";
export type { DatasetOptions } from "./dataset.ts";
export { DatasetError } from "./datasetd_status.ts";
export type { Outcome, OutcomeKind } from "./datasetd_status.ts";
export {
  datasetErrorFromResponse,
  outcomeFromStatus,
} from "./datasetd_status.ts";
