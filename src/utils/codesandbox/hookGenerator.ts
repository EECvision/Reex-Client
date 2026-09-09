import { EndpointArg, EndpointInfo } from "@/types";

export function getHookName(methodName: string) {
  const isQuery = methodName.startsWith("get_");
  const parts = methodName.split("_");
  const prefix = parts[0];
  const rest = parts.slice(1);
  const suffix = rest
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
  const cleanPrefix = prefix
    ? prefix.charAt(0).toUpperCase() + prefix.slice(1)
    : "";
  return "use" + cleanPrefix + suffix + (isQuery ? "Query" : "Mutation");
}

export function generateKeyFactory(
  moduleName: string,
  methodNames: string[],
  methods: Record<string, EndpointInfo>
) {
  const lines = [
    "export const " + moduleName + "Keys = {",
    "  all: [\"" + moduleName + "\"] as const,",
  ];

  methodNames
    .filter((m) => m.startsWith("get_"))
    .forEach((method) => {
      const hasArgs = methods[method]?.args && methods[method].args.length > 0;

      const paramDef = hasArgs
        ? "params: ApiVars<typeof " + moduleName + "Api." + method + ">"
        : "params?: ApiVars<typeof " + moduleName + "Api." + method + ">";

      lines.push(
        "  " + method + ": (" + paramDef + ") => [..." + moduleName + "Keys.all, \"" + method + "\", params] as const,"
      );
    });

  lines.push("};");
  return lines.join("\n");
}

export function toHookContent(
  methodName: string,
  args: EndpointArg[],
  moduleName: string,
  keyFactoryName: string,
  requiresAuth = false,
  contentType: string | undefined = undefined
) {
  const isQuery = methodName.startsWith("get_");
  const hookName = getHookName(methodName);

  const apiMethod = moduleName + "Api." + methodName;
  const apiData = "ApiData<typeof " + apiMethod + ">";
  const apiVars = "ApiVars<typeof " + apiMethod + ">";

  const jsDocLines = [];
  if (requiresAuth) jsDocLines.push(" * @auth");
  if (contentType) jsDocLines.push(" * @contentType " + contentType);

  const jsDoc =
    jsDocLines.length > 0
      ? "/**\n" + jsDocLines.join("\n") + "\n */\n"
      : "";

  if (isQuery) {
    const hasArgs = args && args.length > 0;

    if (hasArgs) {
      return jsDoc + "export const " + hookName + " = <TData = " + apiData + ">(\n" +
"  params: " + apiVars + ",\n" +
"  options?: Omit<\n" +
"    UseQueryOptions<" + apiData + ", Error, TData>,\n" +
"    \"queryKey\" | \"queryFn\"\n" +
"  >\n" +
") =>\n" +
"  useApiQuery(\n" +
"    " + keyFactoryName + "." + methodName + "(params),\n" +
"    () => " + apiMethod + "(params),\n" +
"    options\n" +
"  );";
    }

    return jsDoc + "export const " + hookName + " = <TData = " + apiData + ">(\n" +
"  options?: Omit<\n" +
"    UseQueryOptions<" + apiData + ", Error, TData>,\n" +
"    \"queryKey\" | \"queryFn\"\n" +
"  >\n" +
") =>\n" +
"  useApiQuery(\n" +
"    " + keyFactoryName + "." + methodName + "(),\n" +
"    () => " + apiMethod + "(),\n" +
"    options\n" +
"  );";
  }

  const isDelete = methodName.startsWith("delete_");

  return jsDoc + "export const " + hookName + " = (\n" +
"  options?: Omit<\n" +
"    UseMutationOptions<" + apiData + ", Error, " + apiVars + ">,\n" +
"    \"mutationFn\"\n" +
"  > & { invalidate?: boolean }\n" +
") => {\n" +
"  const queryClient = useQueryClient();\n" +
"\n" +
"  return useApiMutation(" + apiMethod + ", {\n" +
"    ...options,\n" +
"    onSuccess: (data, variables, context) => {\n" +
"      if (options?.invalidate !== false) {\n" +
(isDelete ? 
"        // Automatically remove detail queries matching these exact variables to prevent 404 refetches\n" +
"        if (variables !== undefined) {\n" +
"          queryClient.removeQueries({\n" +
"            predicate: (query) => {\n" +
"              return (\n" +
"                query.queryKey[0] === " + keyFactoryName + ".all[0] &&\n" +
"                JSON.stringify(query.queryKey[2]) === JSON.stringify(variables)\n" +
"              );\n" +
"            },\n" +
"          });\n" +
"        }\n" : "") +
"        queryClient.invalidateQueries({ queryKey: " + keyFactoryName + ".all });\n" +
"      }\n" +
"      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(data, variables, context);\n" +
"    },\n" +
"  });\n" +
"};";
}
