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
    client?: string;
    inputType?: string;
    outputType?: string;
}

export type Methods = "ALL" | "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface ToastItem {
    id: number;
    type: "success" | "error";
    message: string;
}

export interface ProjectConfig {
    clients?: Record<string, string>;
    baseUrl?: string;
    baseURL?: string;
    collectionName?: string;
    clientPrefixes?: Record<string, string>;
    auth?: {
        token?: string;
        customHeaders?: Record<string, string>;
    };
}

export interface OpenAPIOperation {
    tags?: string[];
    summary?: string;
    description?: string;
    operationId?: string;
    parameters?: Array<Record<string, unknown>>;
    requestBody?: {
        content?: Record<string, { schema?: Record<string, unknown> }>;
        description?: string;
        required?: boolean;
    };
    responses?: Record<string, unknown>;
    security?: Array<Record<string, string[]>>;
    [key: string]: unknown;
}

export interface OpenAPISpec {
    openapi?: string;
    swagger?: string;
    info?: {
        title?: string;
        name?: string;
        description?: string;
        version?: string;
        [key: string]: unknown;
    };
    servers?: Array<{ url: string; description?: string; [key: string]: unknown }>;
    host?: string;
    basePath?: string;
    schemes?: string[];
    paths?: Record<string, Record<string, OpenAPIOperation>>;
    security?: Array<Record<string, string[]>>;
    components?: {
        schemas?: Record<string, unknown>;
        securitySchemes?: Record<string, unknown>;
        [key: string]: unknown;
    };
    variable?: Array<{ key?: string; value?: string; disabled?: boolean; [key: string]: unknown }>;
    item?: Array<Record<string, unknown>>;
    [key: string]: unknown;
}

export interface PostmanItem {
    name?: string;
    request?: {
        url?: {
            raw?: string;
            variable?: Array<{ key: string; value?: string }>;
            query?: Array<{ key: string; value?: string; description?: string }>;
            [key: string]: unknown;
        };
        header?: Array<{ key: string; value?: string }>;
        method?: string;
        body?: Record<string, unknown>;
        description?: string;
        auth?: Record<string, unknown>;
        [key: string]: unknown;
    };
    item?: PostmanItem[];
    [key: string]: unknown;
}

export interface StandaloneCollection {
    id: string;
    name: string;
    manifest: Record<string, Record<string, EndpointInfo>>;
    modules: Record<string, string>;
    config: ProjectConfig;
}
