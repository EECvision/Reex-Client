
import { FunctionDiff } from "./DiffModal";

export type CollectionType = "openapi" | "postman" | "unknown";
export type ImportStep = "upload" | "analyzing" | "review" | "updating" | "success";

export interface DiffResult {
    module: string;
    status: "new" | "modified" | "deleted" | "unchanged" | "disabled";
    functions?: FunctionDiff[];
    newContent?: string;
}
export interface AnalysisResponse {
    diffs: DiffResult[];
    proposedClients?: Record<string, string>;
}
