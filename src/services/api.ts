
"use client";

import { CloudService } from "./client/CloudService";
import { BridgeService } from "./client/BridgeService";
import { getLocalUrl } from "./client/utils";

export const api = {
    getBridgeUrl: getLocalUrl,
    ...CloudService,
    ...BridgeService
};
