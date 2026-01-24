import { NextRequest, NextResponse } from "next/server";
import { sendEvent, getBridgeUrl } from "@/app/api/utils";

// Helper to send to Bridge
async function bridgeCall(bridgeUrl: string, endpoint: string, body: any) {
  const res = await fetch(`${bridgeUrl}/api/fs/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Bridge Error (${endpoint}): ${err.message || err.error || res.statusText}`);
  }
  return res.json();
}

function generateTemplateContent(moduleName: string) {
  // Capitalize first letter for type names
  const capitalize = (str: string): string =>
    str.charAt(0).toUpperCase() + str.slice(1);
  const TypeName = capitalize(moduleName.replace(/s$/, "")); // Remove trailing 's' for singular

  return `/* eslint-disable @typescript-eslint/no-explicit-any */
import { BASE_CLIENT } from "../config";
import { constructQueryParams, handleApiCall } from "../config/utils";

// --- Types ---

interface ${TypeName} {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

interface Get${TypeName}sParams {
  search?: string;
  limit?: number;
  page_size?: string;
  status?: ${TypeName}["status"];
}

interface Create${TypeName}Payload {
  email: string;
  first_name: string;
  last_name: string;
  status: ${TypeName}["status"];
}

interface Update${TypeName}Params {
  id: string;
  payload: Partial<Create${TypeName}Payload>;
}

// --- API Definition --- 

export const ${moduleName}Api = {
  get_list${TypeName}s: async (
    params: Get${TypeName}sParams
  ): Promise<any> => {
    const queryString = constructQueryParams(params);
    const url = \`/${moduleName}\${queryString}\`;

    const res = await handleApiCall(
      () => BASE_CLIENT.get(url),
      "get_list${TypeName}s"
    );
    return res.data;
  },

  get_${moduleName.slice(0, -1)}Detail: async ({ id } : { id: string }): Promise<any> => {
    const url = \`/${moduleName}/\${id}\`;
    const res = await handleApiCall(
      () => BASE_CLIENT.get(url),
      "get_${moduleName.slice(0, -1)}Detail"
    );
    return res.data;
  },

  post_create${TypeName}: async (
    payload: Create${TypeName}Payload
  ): Promise<any> => {
    const url = "/${moduleName}";
    const res = await handleApiCall(
      () => BASE_CLIENT.post(url, payload),
      "post_create${TypeName}"
    );
    return res.data;
  },

  put_update${TypeName}: async ({
    id,
    payload,
  }: Update${TypeName}Params): Promise<any> => {
    const url = \`/${moduleName}/\${id}\`;
    const res = await handleApiCall(
      () => BASE_CLIENT.put(url, payload),
      "put_update${TypeName}"
    );
    return res.data;
  },

  delete_remove${TypeName}: async ({ id } : { id: string }): Promise<any> => {
    const url = \`/${moduleName}/\${id}\`;
    await handleApiCall(() => BASE_CLIENT.delete(url), "delete_remove${TypeName}");
  },
};
`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { moduleName, bridgeUrl, taskId: clientTaskId } = body;

    // Use client provided taskId to prevent race conditions
    const taskId = clientTaskId || Date.now().toString();

    if (!moduleName) {
      return NextResponse.json({ success: false, error: "Module name required" }, { status: 400 });
    }

    const content = generateTemplateContent(moduleName);
    const filePath = `src/api-services/definitions/${moduleName}.ts`;

    return NextResponse.json({
      success: true,
      operation: {
        type: 'write',
        filePath,
        content
      }
    });

  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.toString() }, { status: 500 });
  }
}
