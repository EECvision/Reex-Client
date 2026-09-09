// This file is auto-generated.

export interface ApiProperty {
  name: string;
  isOptional: boolean;
  type?: string;
  isObject?: boolean;
  properties?: ApiProperty[];
}

export interface ApiParameter {
  name: string;
  isOptional: boolean;
  type?: string;
  isObject?: boolean;
  properties?: ApiProperty[];
}

export interface ApiMethod {
  args: ApiParameter[];
}

export interface ApiManifest {
  [module: string]: {
    [method: string]: ApiMethod;
  };
}

export const apiManifest: ApiManifest = {
  "watcher_test_module_1768400491229": {},
  "watcher_test_module_1768400963960": {}
};
