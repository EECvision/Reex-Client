import { NextRequest, NextResponse } from "next/server";
import { getApiServicesDir } from "@/app/api/utils";

function generateTemplateContent(moduleName: string) {
  // Capitalize first letter for type names
  const capitalize = (str: string): string =>
    str.charAt(0).toUpperCase() + str.slice(1);
  const TypeName = capitalize(moduleName.replace(/s$/, "")); // Remove trailing 's' for singular

  return [
    "/* eslint-disable @typescript-eslint/no-explicit-any */",
    "import { apiClient } from \"../core\";",
    "import { type get_list" + TypeName + "s } from \"../types/" + moduleName + "/get_list" + TypeName + "s\";",
    "import { type get_" + moduleName.slice(0, -1) + "Detail } from \"../types/" + moduleName + "/get_" + moduleName.slice(0, -1) + "Detail\";",
    "import { type post_create" + TypeName + " } from \"../types/" + moduleName + "/post_create" + TypeName + "\";",
    "import { type put_update" + TypeName + " } from \"../types/" + moduleName + "/put_update" + TypeName + "\";",
    "",
    "// --- Types ---",
    "",
    "interface " + TypeName + " {",
    "  id: string;",
    "  email: string;",
    "  first_name: string;",
    "  last_name: string;",
    "  status: \"ACTIVE\" | \"INACTIVE\" | \"SUSPENDED\";",
    "}",
    "",
    "interface Get" + TypeName + "sParams {",
    "  search?: string;",
    "  limit?: number;",
    "  page_size?: string;",
    "  status?: " + TypeName + "[\"status\"];",
    "}",
    "",
    "interface Create" + TypeName + "Payload {",
    "  email: string;",
    "  first_name: string;",
    "  last_name: string;",
    "  status: " + TypeName + "[\"status\"];",
    "}",
    "",
    "interface Update" + TypeName + "Params {",
    "  id: string;",
    "  payload: Partial<Create" + TypeName + "Payload>;",
    "}",
    "",
    "// --- API Definition --- ",
    "",
    "export const " + moduleName + "Api = {",
    "  get_list" + TypeName + "s: (",
    "    params: Get" + TypeName + "sParams",
    "  ): Promise<get_list" + TypeName + "s> =>",
    "    apiClient.get('/path/to/" + moduleName + "', { params }),",
    "",
    "  get_" + moduleName.slice(0, -1) + "Detail: ({ id } : { id: string }): Promise<get_" + moduleName.slice(0, -1) + "Detail> =>",
    "    apiClient.get(`/path/to/" + moduleName + "/${id}`),",
    "",
    "  post_create" + TypeName + ": (",
    "    payload: Create" + TypeName + "Payload",
    "  ): Promise<post_create" + TypeName + "> =>",
    "    apiClient.post('/path/to/" + moduleName + "', payload),",
    "",
    "  put_update" + TypeName + ": ({",
    "    id,",
    "    payload,",
    "  }: Update" + TypeName + "Params): Promise<put_update" + TypeName + "> =>",
    "    apiClient.put(`/path/to/" + moduleName + "/${id}`, payload),",
    "",
    "  delete_remove" + TypeName + ": ({ id } : { id: string }): Promise<any> =>",
    "    apiClient.delete(`/path/to/" + moduleName + "/${id}`),",
    "};",
    ""
  ].join("\n");

}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { moduleName, targetDir, apiServicesDir } = body;

    const API_SERVICES_DIR = getApiServicesDir(targetDir || process.env.API_TARGET_DIR || process.cwd(), apiServicesDir);

    if (!moduleName) {
      return NextResponse.json({ success: false, error: "Module name required" }, { status: 400 });
    }

    const content = generateTemplateContent(moduleName);
    const filePath = `${API_SERVICES_DIR}/definitions/${moduleName}.ts`;

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
