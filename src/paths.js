/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');
const fs = require('fs');

// root is src/.. which is api-next-server root
const LOCAL_ROOT = process.cwd();

// BUT if API_TARGET_DIR is set, use that as PROJECT root for Target files (defs, types, hooks)
const PROJECT_ROOT = process.env.API_TARGET_DIR || LOCAL_ROOT;

// The client/server IS the project root in this context
const CLIENT_ROOT = PROJECT_ROOT;
const hasClientSrcFolderPath = fs.existsSync(path.join(PROJECT_ROOT, 'src'));
const CLIENT_SRC = hasClientSrcFolderPath ? path.join(PROJECT_ROOT, 'src') : PROJECT_ROOT;
const LOCAL_SRC = path.join(LOCAL_ROOT, 'src');

module.exports = {
    PROJECT_ROOT,
    LOCAL_ROOT,
    CLIENT_ROOT,
    CLIENT_SRC, // Used for Target files

    // Target Paths (api-services, definitions, types, generated)
    API_SERVICES_DIR: path.join(CLIENT_SRC, 'api-services'),
    API_SERVICES_CONFIG_DIR: path.join(CLIENT_SRC, 'api-services/config'), // If any config goes to target
    API_DEFINITIONS_DIR: path.join(CLIENT_SRC, 'api-services/definitions'),
    API_TYPES_DIR: path.join(CLIENT_SRC, 'api-services/types'),
    API_GENERATED_DIR: path.join(CLIENT_SRC, 'api-services/generated'),

    // config is in src/config
    CLIENT_CONFIG_DIR: path.join(LOCAL_SRC, 'config'), // Local Config for Tool
    PROVIDERS_DIR: path.join(CLIENT_SRC, 'providers'), // Providers in Target? Or Tool? 

    // Manifests (Tool Needs These Locally)
    API_MANIFEST_PATH: path.join(LOCAL_SRC, 'config/apiManifest.ts'),
    API_MODULES_PATH: path.join(LOCAL_SRC, 'config/apiModules.ts'),
};
