const fs = require('fs');
const path = require('path');

const templatesPath = path.join('d:', 'Dev', 'api-builder', 'api-next-server', 'src', 'utils', 'codesandbox', 'templates.ts');
const tokensPath = path.join('d:', 'Dev', 'api-builder', 'api-npm-bridge', 'templates-shared', 'hooks', 'useTokens.ts');
const headersPath = path.join('d:', 'Dev', 'api-builder', 'api-npm-bridge', 'templates-shared', 'hooks', 'useHeaders.ts');

const tokensContent = fs.readFileSync(tokensPath, 'utf8');
const headersContent = fs.readFileSync(headersPath, 'utf8');

let templatesContent = fs.readFileSync(templatesPath, 'utf8');

templatesContent += `\nexport const USE_TOKENS_HOOK_CONTENT =\n  ${JSON.stringify(tokensContent)};\n`;
templatesContent += `\nexport const USE_HEADERS_HOOK_CONTENT =\n  ${JSON.stringify(headersContent)};\n`;

fs.writeFileSync(templatesPath, templatesContent, 'utf8');
console.log('Appended hook templates to templates.ts');
