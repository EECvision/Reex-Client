export interface EndpointArg {
    name: string;
    isOptional: boolean;
    isObject?: boolean;
    properties?: {
        name: string;
        isOptional: boolean;
    }[];
}

export interface EndpointInfo {
    apiKey: string;
    fnName: string;
    args: EndpointArg[];
    url?: string;
    method?: string;
    requiresAuth?: boolean;
    contentType?: string;
}

export type Methods = "ALL" | "GET" | "POST" | "DELETE" | "PATCH";

export interface ToastItem {
    id: number;
    type: "success" | "error";
    message: string;
}
