const path = require('path');

// root is src/.. which is api-next-server root
// BUT if API_TARGET_DIR is set (e.g. by bridge or scripts), use that as root
const PROJECT_ROOT = process.env.API_TARGET_DIR || path.resolve(__dirname, '..');
// The client/server IS the project root in this context
const CLIENT_ROOT = PROJECT_ROOT;
const CLIENT_SRC = path.join(PROJECT_ROOT, 'src');

module.exports = {
    PROJECT_ROOT,
    CLIENT_ROOT,
    CLIENT_SRC,
    // api-services is in src/api-services
    API_SERVICES_DIR: path.join(CLIENT_SRC, 'api-services'),
    API_SERVICES_CONFIG_DIR: path.join(CLIENT_SRC, 'api-services/config'),
    API_DEFINITIONS_DIR: path.join(CLIENT_SRC, 'api-services/definitions'),
    API_TYPES_DIR: path.join(CLIENT_SRC, 'api-services/types'),
    API_GENERATED_DIR: path.join(CLIENT_SRC, 'api-services/generated'),

    // config is in src/config (but for next.js it might differ? user has src/config/apiModules.ts?)
    CLIENT_CONFIG_DIR: path.join(CLIENT_SRC, 'config'),
    PROVIDERS_DIR: path.join(CLIENT_SRC, 'providers'),

    // Manifests
    API_MANIFEST_PATH: path.join(CLIENT_SRC, 'config/apiManifest.ts'),
    // Note: apiModules.ts seems to be in src/config based on user info
    API_MODULES_PATH: path.join(CLIENT_SRC, 'config/apiModules.ts'),
};
