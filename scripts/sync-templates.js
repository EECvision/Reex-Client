const fs = require('fs');
const path = require('path');

if (process.argv.length < 3) {
  console.error("Usage: node scripts/sync-templates.js <target_api_services_dir>");
  process.exit(1);
}

const targetDir = path.resolve(process.cwd(), process.argv[2]);
if (!fs.existsSync(targetDir)) {
  console.error(`Target directory not found: ${targetDir}`);
  process.exit(1);
}

const serverDir = path.resolve(__dirname, '..');
const templatesTsPath = path.join(serverDir, 'src/utils/codesandbox/templates.ts');
const docsTxtPath = path.join(serverDir, 'src/data/docs-context.txt');

// Mapping of generated file paths to CodeSandbox constants and docs-context filenames
const syncMap = [
  // Hooks
  { file: 'hooks/useAuthSession.ts', constant: 'USE_AUTH_SESSION_HOOK_CONTENT', docPath: 'hooks/useAuth.ts' },
  { file: 'hooks/notification.ts', constant: 'NOTIFICATION_CONTENT', docPath: null },
  { file: 'hooks/useNotification.ts', constant: 'USE_NOTIFICATION_HOOK_CONTENT', docPath: null },
  { file: 'hooks/useHeaders.ts', constant: 'USE_HEADERS_HOOK_CONTENT', docPath: null },
  
  // Providers
  { file: 'providers/NotificationProvider.tsx', constant: 'NOTIFICATION_PROVIDER_CONTENT', docPath: null },
  
  // Core
  { file: 'core.ts', constant: 'BASE_API_CLIENT_CONTENT', docPath: 'api-client/core.ts' },
  { file: '.reex/config.ts', constant: 'REEX_CONFIG_CONTENT', docPath: null },
  { file: 'api.config.ts', constant: 'API_CONFIG_CONTENT', docPath: null },
  
  // Auth Methods (Base)
  { file: 'auth-methods/types.ts', constant: 'AUTH_TYPES_CONTENT', docPath: 'auth/types.ts' },
  { file: 'auth-methods/manager.ts', constant: 'AUTH_MANAGER_CONTENT', docPath: 'auth/manager.ts' },
  { file: 'auth-methods/AuthProvider.tsx', constant: 'AUTH_PROVIDER_CONTENT', docPath: 'auth/AuthProvider.tsx' },
  
  // Cookie Auth
  { file: 'auth-methods/cookie-auth/CookieAuthGuard.tsx', constant: 'COOKIE_GUARD_CONTENT', docPath: 'cookie-auth/CookieAuthGuard.tsx' },
  { file: 'auth-methods/cookie-auth/provider.ts', constant: 'COOKIE_PROVIDER_CONTENT', docPath: 'cookie-auth/provider.ts' },
  
  // JWT Auth
  { file: 'auth-methods/jwt-auth/JwtAuthGuard.tsx', constant: 'JWT_GUARD_CONTENT', docPath: 'jwt-auth/JwtAuthGuard.tsx' },
  { file: 'auth-methods/jwt-auth/provider.ts', constant: 'JWT_PROVIDER_CONTENT', docPath: 'jwt-auth/provider.ts' },
  
  // Next Auth
  { file: 'auth-methods/next-auth/NextAuthGuard.tsx', constant: 'NEXT_AUTH_GUARD_CONTENT', docPath: 'next-auth/NextAuthGuard.tsx' },
  { file: 'auth-methods/next-auth/provider.ts', constant: 'NEXT_AUTH_PROVIDER_CONTENT', docPath: 'next-auth/provider.ts' }
];

let templatesTs = fs.readFileSync(templatesTsPath, 'utf8');
let docsContextTxt = fs.readFileSync(docsTxtPath, 'utf8');

for (const item of syncMap) {
    const fullPath = path.join(targetDir, item.file);
    if (!fs.existsSync(fullPath)) {
        console.warn(`[Warning] Could not find ${item.file} in target directory. Skipping...`);
        continue;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    if (content) {
        content = content.trimEnd() + '\n';
    }
    
    // 1. Update templates.ts
    if (item.constant) {
        const escapedConstant = item.constant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const templatesRegex = new RegExp(`(export\\s+const\\s+${escapedConstant}\\s*=\\s*)([\\s\\S]*?)(?=\\nexport\\s+const|\\n\\nexport|$)`);
        
        const beforeReplace = templatesTs;
        templatesTs = templatesTs.replace(templatesRegex, (match, p1) => {
            return `${p1}${JSON.stringify(content)};`;
        });
        
        if (beforeReplace === templatesTs) {
            console.warn(`[Warning] Failed to replace ${item.constant} in templates.ts`);
        } else {
            console.log(`[Success] Synced ${item.constant} in templates.ts`);
        }
    }

    // 2. Update docs-context.txt
    if (item.docPath) {
        const escapedDocPath = item.docPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const docsRegex = new RegExp(`(\`\`\`[a-z]+\\s+filename="${escapedDocPath}"\\r?\\n)([\\s\\S]*?)(?=\\n\\s*\`\`\`)`, 'g');
        
        const docsBefore = docsContextTxt;
        docsContextTxt = docsContextTxt.replace(docsRegex, (match, p1) => {
            return `${p1}${content.trimEnd()}`;
        });
        
        if (docsBefore === docsContextTxt) {
            console.warn(`[Warning] Failed to replace block for filename="${item.docPath}" in docs-context.txt`);
        } else {
            console.log(`[Success] Synced filename="${item.docPath}" in docs-context.txt`);
        }
    }
}

fs.writeFileSync(templatesTsPath, templatesTs, 'utf8');
fs.writeFileSync(docsTxtPath, docsContextTxt, 'utf8');

console.log('\nSynchronization complete!');
