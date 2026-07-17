const fs = require('fs');
const path = require('path');

const templatesPath = 'd:\\Dev\\api-builder\\api-next-server\\src\\utils\\codesandbox\\templates.ts';
let templatesContent = fs.readFileSync(templatesPath, 'utf8');

// 1. Update REACT_QUERY_WRAPPERS_CONTENT
const reactQueryContent = `// Generated file - DO NOT EDIT\\nimport { type QueryKey, type UseMutationOptions, type UseQueryOptions, type UseQueryResult, type DefaultError, useMutation, useQuery } from '@tanstack/react-query';\\n\\nimport { getActiveProvider } from \\"../auth-methods/manager\\";\\n\\nexport const useApiMutation = <TData = unknown, TVariables = void, TError = DefaultError, TContext = unknown>(mutationFn: (variables: TVariables) => Promise<TData>, options?: Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'>) => { return useMutation<TData, TError, TVariables, TContext>({ mutationFn, ...options }); };\\n\\nexport const useApiQuery = <TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(queryKey: TQueryKey, queryFn: () => Promise<TQueryFnData>, options?: Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryKey' | 'queryFn'>): UseQueryResult<TData, TError> => { const isEnabled = options?.enabled !== false ? !!getActiveProvider()?.getToken?.() : false; return useQuery<TQueryFnData, TError, TData, TQueryKey>({ queryKey, queryFn, refetchOnWindowFocus: false, retry: 1, ...options, enabled: isEnabled }); };`;

templatesContent = templatesContent.replace(
  /export const REACT_QUERY_WRAPPERS_CONTENT =[\s\S]*?(?=\nexport const|\n$|$)/,
  `export const REACT_QUERY_WRAPPERS_CONTENT =\n  "${reactQueryContent}";`
);

// 2. Update USE_AUTH_HOOK_CONTENT
const useAuthPath = 'd:\\Dev\\api-builder\\api-npm-bridge\\templates-shared\\hooks\\useAuth.ts';
const useAuthContent = fs.readFileSync(useAuthPath, 'utf8');

const escapedUseAuthContent = useAuthContent
  .replace(/\\/g, '\\\\')
  .replace(/'/g, "\\'")
  .replace(/\r/g, '\\r')
  .replace(/\n/g, '\\n');

templatesContent = templatesContent.replace(
  /export const USE_AUTH_HOOK_CONTENT =[\s\S]*?';/,
  `export const USE_AUTH_HOOK_CONTENT =\n  '${escapedUseAuthContent}';`
);

fs.writeFileSync(templatesPath, templatesContent);
console.log('Successfully updated templates.ts');
