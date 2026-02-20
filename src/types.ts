export interface EndpointArgProperty {
    name: string;
    isOptional: boolean;
    description?: string;
    type?: string;
    properties?: EndpointArgProperty[];
}

export interface EndpointArg {
    name: string;
    isOptional: boolean;
    description?: string;
    type?: string;
    isObject?: boolean;
    properties?: EndpointArgProperty[];
}

export interface EndpointInfo {
    apiKey: string;
    fnName: string;
    args: EndpointArg[];
    url: string;
    method: string;
    requiresAuth?: boolean;
    contentType?: string;
    description?: string;
}

export type Methods = "ALL" | "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface ToastItem {
    id: number;
    type: "success" | "error";
    message: string;
}
