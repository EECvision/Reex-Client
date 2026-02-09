import React from 'react';
import { Book, Code, Terminal, FileText, Layers, Archive, AlertCircle, CheckCircle, Box, Cloud, TestTube, Play } from 'lucide-react';
import styles from './docs.module.css';

export interface DocSection {
    id: string;
    title: string;
    icon?: React.ElementType;
    content?: React.ReactNode;
    items?: DocSection[];
}

export const docSections: DocSection[] = [
    {
        id: 'intro',
        title: 'Introduction & Philosophy',
        icon: Book,
        content: (
            <>
                <h1>Introduction & Philosophy</h1>

                <h3>What is Reex API Builder?</h3>
                <p>
                    Reex API Builder is a developer-first tool designed to streamline the lifecycle of API testing and integration. While traditional tools focus heavily on backend verification, Reex API Builder is built specifically with the Frontend Developer in mind.
                </p>
                <p>
                    It is not just an API client; it is a code generation engine. Reex API Builder connects directly to your local project, managing the gap between your API definitions and your UI components by generating strictly typed, production ready hooks directly into your codebase.
                </p>

                <h3>How is it different?</h3>
                <p>
                    The standard workflow for frontend developers often involves manually typing out API collections, creating interfaces, and writing repetitive fetch hooks.
                </p>
                <p>Reex API Builder eliminates this boilerplate.</p>
                <ul>
                    <li><strong>No more manual typing</strong>: We generate your API collections for you.</li>
                    <li><strong>No more interface mismatch</strong>: We generate TypeScript interfaces automatically.</li>
                    <li><strong>Seamless Integration</strong>: The tool runs alongside your code, injecting the necessary logic directly into your project structure.</li>
                </ul>

                <h3>Core Modules</h3>
                <p>Reex API Builder is composed of three powerful modules to suit different stages of development:</p>

                <div className={styles.moduleGrid}>
                    <a href="#project-module" className={styles.moduleCard}>
                        <div className={styles.cardHeader}>
                            <div className={styles.cardIcon}>
                                <Layers size={24} />
                            </div>
                            <h4 className={styles.cardTitle}>Project Module</h4>
                        </div>
                        <p className={styles.cardDescription}>
                            The core engine that connects to your local codebase for generation and syncing.
                        </p>
                    </a>

                    <a href="#standalone-module" className={styles.moduleCard}>
                        <div className={styles.cardHeader}>
                            <div className={styles.cardIcon}>
                                <Cloud size={24} />
                            </div>
                            <h4 className={styles.cardTitle}>Standalone Module</h4>
                        </div>
                        <p className={styles.cardDescription}>
                            A lightweight mode for managing collections in the cloud without a local connection.
                        </p>
                    </a>

                    <a href="#test-module" className={styles.moduleCard}>
                        <div className={styles.cardHeader}>
                            <div className={styles.cardIcon}>
                                <TestTube size={24} />
                            </div>
                            <h4 className={styles.cardTitle}>Test Module</h4>
                        </div>
                        <p className={styles.cardDescription}>
                            A flexible scratchpad for manual API testing and quick interface generation.
                        </p>
                    </a>
                </div>
            </>
        ),
    },
    {
        id: 'project-module',
        title: 'Project Module',
        icon: Layers,
        content: (
            <>
                <h1>Project Module</h1>
                <p>
                    The Project Module is the flagship experience of Reex API Builder. It establishes a direct link between the Reex UI and your local React application.
                </p>
                <p>
                    In this mode, Reex API Builder acts as a companion app that lives alongside your development server. It reads your project structure, installs necessary dependencies, and injects generated code directly into your file system.
                </p>
            </>
        ),
        items: [
            {
                id: 'getting-started',
                title: 'Getting Started',
                content: (
                    <>
                        <h1>Getting Started</h1>
                        <p>
                            Getting up and running with Reex API Builder is designed to be frictionless. The tool handles the heavy lifting of installing dependencies and setting up the required infrastructure in your React application.
                        </p>

                        <h3>Prerequisites</h3>
                        <p>Before installing, ensure your environment meets the following requirements:</p>
                        <ul>
                            <li><strong>Node.js</strong>: Installed and configured.</li>
                            <li><strong>React</strong>: Your project must be a React-based application.</li>
                            <li><strong>Package Manager</strong>: <code>npm</code>, <code>yarn</code>, or <code>pnpm</code>.</li>
                        </ul>

                        <h3>Step 1: Install the CLI</h3>
                        <p>
                            Reex API Builder relies on a global CLI package to bridge the connection between the Reex API Builder (the UI) and your local project files.
                        </p>
                        <p>Open your terminal and install the builder globally:</p>
                        <pre><code>npm install -g reex-api-builder</code></pre>

                        <h3>Step 2: Initialize Your Project</h3>
                        <p>Navigate to the root directory of your React project. Run the initialization command to launch Reex API Builder in Project Mode:</p>
                        <pre><code>reex-api</code></pre>

                        <h3>Step 3: Automatic Dependency Management</h3>
                        <p>
                            When you run the command above, Reex API Builder performs a health check on your project. It automatically detects if the necessary data-fetching libraries are present.
                        </p>
                        <p>If they are missing, Reex API Builder will install them for you automatically:</p>
                        <ul>
                            <li><strong>Axios</strong>: For handling HTTP requests.</li>
                            <li><strong>TanStack Query (React Query)</strong>: For robust server state management.</li>
                        </ul>

                        <h3>Step 4: Configure the Provider</h3>
                        <p>
                            Reex API Builder generates a dedicated Providers component to manage the query client context. You must wrap your application with this provider to enable the generated hooks.
                        </p>
                        <ol>
                            <li>Open your project's root file (usually <code>App.tsx</code>, <code>main.tsx</code>, or <code>index.tsx</code>).</li>
                            <li>Import the <code>QueryProvider</code> from the newly created <code>api-services/providers</code> folder.</li>
                            <li>Wrap your root component:</li>
                        </ol>
                        <pre><code>{`import { QueryProvider } from './api-services/providers';

function App() {
  return (
    <QueryProvider>
      <YourApp />
    </QueryProvider>
  );
}`}</code></pre>
                    </>
                ),
            },
            {
                id: 'workflow',
                title: 'The Workflow',
                content: (
                    <>
                        <h1>The Project Workflow</h1>
                        <p>
                            Project Mode connects the builder UI directly to your local codebase, creating a seamless loop between your API specifications and your frontend logic.
                        </p>

                        <h3>Step 1: Import</h3>
                        <p>
                            Launch the builder using <code>reex-api</code>. Click <strong>Import</strong> to bring in your API collection.
                        </p>
                        <ul>
                            <li><strong>Supported Formats</strong>: Swagger/OpenAPI, Postman JSON.</li>
                            <li><strong>Result</strong>: Reex API Builder parses the file and prepares it for analysis.</li>
                        </ul>

                        <h3>Step 2: Analyze & Generate</h3>
                        <p>Once imported, click <strong>Analyze</strong>. The tool reviews the collection structure.</p>
                        <p>Click <strong>Update Selected</strong> to generate the code.</p>
                        <p>Reex API Builder immediately creates the <code>api-services</code> folder structure in your project.</p>

                        <h3>Step 3: The Two-Way Sync</h3>
                        <p>Reex API Builder maintains a live link between the UI and your code.</p>
                        <ul>
                            <li><strong>UI to Code</strong>: Changes made in the Reex API Builder (like renaming an endpoint) are written to your definitions files.</li>
                            <li><strong>Code to UI</strong>: Because <code>definitions</code> is the single source of truth, you can manually edit the TypeScript files in your IDE. The Reex API Builder UI will automatically detect these changes and update its display.</li>
                        </ul>

                        <h3>Step 4: Handling Updates (Diff View)</h3>
                        <p>APIs change. When you re-import an updated Swagger or Postman file, Reex API Builder protects your code from silent overwrites.</p>
                        <ul>
                            <li><strong>Conflict Detection</strong>: The tool compares the Incoming collection against your Current definitions.</li>
                            <li><strong>Diff View</strong>: You are presented with a side-by-side "Git-style" diff view. You can see exactly what changed (e.g., a new <code>firstName</code> string added to a payload) and decide whether to accept or reject the update.</li>
                        </ul>
                    </>
                ),
            },
            {
                id: 'architecture',
                title: 'Architecture',
                content: (
                    <>
                        <h1>Architecture</h1>
                        <p>
                            When you run the generator, Reex API Builder creates a structured <code>api-services</code> directory in the <code>src</code> folder of your project. Understanding this structure is key to leveraging the tool effectively.
                        </p>

                        <h3>Overview</h3>
                        <p>Here is the folder structure that gets generated:</p>
                        <pre><code>{`src/
└── api-services/
    ├── config/
    │   ├── clients.ts      # HTTP client instances
    │   ├── constants.ts    # Base URLs and environment config
    │   ├── core.ts         # Request interceptors & auth logic
    │   ├── index.ts        # Config barrel export
    │   ├── metadata.json   # Collection metadata
    │   └── utils.ts        # Helper utilities
    ├── definitions/        # Your API implementations (editable)
    ├── generated/          # Auto-generated React Query hooks
    ├── types/              # TypeScript interfaces
    └── index.ts            # Main barrel export`}</code></pre>

                        <h3>config/ - Configuration Files</h3>
                        <p>This folder contains the core configuration for the HTTP client:</p>
                        <ul>
                            <li><strong>clients.ts</strong>: Defines the Axios instances used for API calls.</li>
                            <li><strong>constants.ts</strong>: Contains the <code>BASE_URL</code> extracted from your API spec. Update this to switch environments.</li>
                            <li><strong>core.ts</strong>: Request/response interceptors and authorization header logic.</li>
                            <li><strong>metadata.json</strong>: Stores information about the imported collection.</li>
                            <li><strong>utils.ts</strong>: Utility functions for request handling.</li>
                        </ul>

                        <h3>definitions/ - The Source of Truth</h3>
                        <p>This is the most important folder. It contains the raw REST API implementations.</p>
                        <ul>
                            <li><strong>Editable</strong>: You are encouraged to edit these files to customize behavior.</li>
                            <li><strong>Structure</strong>: Each file exports an API object with async functions for each endpoint.</li>
                            <li><strong>Two-Way Sync</strong>: Changes here are reflected in the Reex API Builder UI.</li>
                        </ul>

                        <h3>generated/ - React Query Hooks</h3>
                        <p>This folder contains the React hooks generated from your definitions.</p>
                        <ul>
                            <li><strong>Read-Only</strong>: Do not edit these files. They are regenerated when definitions change.</li>
                            <li><strong>Auto Keys</strong>: Query keys are generated automatically for caching.</li>
                            <li><strong>Auto Invalidation</strong>: Mutation hooks invalidate related queries on success.</li>
                        </ul>

                        <h3>types/ - TypeScript Interfaces</h3>
                        <p>Contains the TypeScript interfaces for your API requests and responses.</p>
                        <ul>
                            <li><strong>Organization</strong>: Subfolders correspond to your API modules.</li>
                            <li><strong>Full Type Safety</strong>: Automatically imported into definitions and hooks.</li>
                        </ul>
                    </>
                ),
            },
            {
                id: 'key-features',
                title: 'Key Features',
                content: (
                    <>
                        <h1>Key Features</h1>

                        <h3>Frontend-First Approach</h3>
                        <p>
                            Reex API Builder is designed with the frontend developer in mind, automatically generating the boilerplate code needed to integrate APIs into your React application.
                        </p>

                        <h3>Type Safety</h3>
                        <p>
                            All generated code is fully typed using TypeScript, ensuring compile-time safety and excellent IDE autocomplete support.
                        </p>

                        <h3>Smart Caching & Invalidation</h3>
                        <p>
                            Generated TanStack Query hooks include intelligent cache invalidation strategies, keeping your UI in sync with server state.
                        </p>

                        <h3>Two-Way Sync</h3>
                        <p>
                            Edit your API definitions in the Reex API Builder UI or directly in your IDE - changes are synchronized bidirectionally.
                        </p>

                        <h3>Conflict Resolution</h3>
                        <p>
                            When APIs change, Reex API Builder shows you exactly what's different through a Git-style diff view, giving you full control over what to accept or reject.
                        </p>
                    </>
                ),
            },
        ]
    },
    {
        id: 'standalone-module',
        title: 'Standalone Module',
        icon: Cloud,
        content: (
            <>
                <h1>Standalone Mode</h1>
                <p>
                    Standalone Mode allows you to quickly test and explore API collections without connecting to a local project. It's perfect for API exploration, debugging, and testing endpoints in isolation.
                </p>

                <h3>What is Standalone Mode?</h3>
                <p>
                    Standalone Mode is a lightweight, project-independent environment for working with API collections. Unlike Project Mode, which integrates directly with your codebase, Standalone Mode operates independently—making it ideal for:
                </p>
                <ul>
                    <li><strong>Quick API Testing</strong> - Test endpoints without setting up a full project</li>
                    <li><strong>API Exploration</strong> - Explore new APIs before integrating them</li>
                    <li><strong>Debugging</strong> - Isolate and debug specific API calls</li>
                    <li><strong>Multiple Collections</strong> - Work with multiple API collections simultaneously</li>
                </ul>
            </>
        ),
        items: [
            {
                id: 'standalone-getting-started',
                title: 'Getting Started',
                content: (
                    <>
                        <h1>Getting Started with Standalone Mode</h1>

                        <h3>Launching Standalone Mode</h3>
                        <p>
                            Reex API Builder defaults to Standalone Mode when not connected to a project. Logically, the app operates in either Project Mode or Standalone Mode.
                        </p>
                        <p><strong>To use Standalone Mode:</strong></p>
                        <p>Visit the web app directly:</p>
                        <pre><code>https://reex-api-client.vercel.app/</code></pre>
                        <p>The app launches in Standalone Mode by default, ready for you to import and test collections.</p>

                        <h3>Switching from Project Mode</h3>
                        <p>If you're currently in Project Mode and want to switch to Standalone:</p>
                        <ol>
                            <li><strong>Stop the Project Bridge</strong> - First, stop the <code>reex-api-bridge</code> from watching your project</li>
                        </ol>
                        <pre><code>{`# In your terminal where reex-api-bridge is running
Ctrl + C  # or Cmd + C on Mac`}</code></pre>
                        <ol start={2}>
                            <li><strong>Launch in Standalone Mode</strong></li>
                        </ol>
                        <pre><code>reex-api-builder --standalone</code></pre>
                        <blockquote>
                            <strong>Important:</strong> You must stop the project bridge before switching to Standalone Mode. Running both simultaneously can cause conflicts.
                        </blockquote>
                    </>
                )
            },
            {
                id: 'standalone-workflow',
                title: 'The Workflow',
                content: (
                    <>
                        <h1>The Workflow</h1>
                        <p>Standalone Mode follows a simple three-step workflow:</p>

                        <h3>Step 1: Import a Collection</h3>
                        <p>Click the <strong>Import</strong> button in the toolbar to bring in your API collection.</p>

                        <h4>Supported Formats</h4>
                        <ul>
                            <li><strong>Swagger/OpenAPI</strong> - JSON or YAML format</li>
                            <li><strong>Postman Collection</strong> - JSON export from Postman</li>
                        </ul>

                        <h4>Import Methods</h4>
                        <p><strong>From File:</strong></p>
                        <pre><code>{`1. Click "Import" → "From File"
2. Select your .json file (YAML import not yet implemented)
3. Collection appears in the sidebar`}</code></pre>

                        <p><strong>From URL:</strong></p>
                        <pre><code>{`1. Click "Import" → "From URL"
2. Paste the API spec URL
3. Click "Fetch"`}</code></pre>
                        <blockquote>
                            <strong>Tip:</strong> You can import multiple collections. Each collection appears as a separate folder in the sidebar.
                        </blockquote>

                        <h3>Step 2: Send a Request</h3>
                        <p>Once your collection is imported, you can start making requests.</p>

                        <h4>Selecting an Endpoint</h4>
                        <ol>
                            <li><strong>Expand the collection</strong> in the left sidebar</li>
                            <li><strong>Click on any endpoint</strong> (e.g., <code>GET /users</code>, <code>POST /login</code>)</li>
                            <li>The request panel opens on the right</li>
                        </ol>

                        <h4>Configuring the Request</h4>
                        <p>
                            When you select an endpoint from your imported collection, <strong>the request is automatically configured</strong> with all parameters, headers, and body schema from the collection specification.
                        </p>
                        <p><strong>The Base URL:</strong></p>
                        <ul>
                            <li>Automatically set from the collection</li>
                            <li>Displayed at the top of the request panel</li>
                            <li><strong>Editable</strong> - click to modify if needed (e.g., switching from production to staging)</li>
                        </ul>

                        <p><strong>Set Parameters</strong> (if needed):</p>
                        <pre><code>{`Query Params:
  page: 1
  limit: 10

Path Params:
  userId: 123

Headers:
  Authorization: Bearer <your-token>
  Content-Type: application/json`}</code></pre>

                        <p><strong>Add Request Body</strong> (for POST/PUT/PATCH):</p>
                        <pre><code>{`{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com"
}`}</code></pre>

                        <p><strong>Set Authentication:</strong></p>
                        <ul>
                            <li>Click the <strong>Auth</strong> tab</li>
                            <li>Choose <strong>Bearer Token</strong> (currently the only implemented auth type)</li>
                            <li>Enter your token</li>
                        </ul>

                        <h4>Send the Request</h4>
                        <p>Click the <strong>Send</strong> button. Reex API Builder makes the request and displays the response in real-time.</p>

                        <h3>Step 3: View Response and Interface</h3>
                        <p>After sending a request, you'll see two panels:</p>

                        <h4>Response Panel</h4>
                        <p><strong>Response Body:</strong></p>
                        <pre><code>{`{
  "id": "user_123",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "createdAt": "2025-02-07T10:30:00Z"
}`}</code></pre>

                        <p><strong>Status & Timing:</strong></p>
                        <pre><code>{`Status: 200 OK
Time: 234ms
Size: 156 bytes`}</code></pre>

                        <h4>Interface Panel (TypeScript)</h4>
                        <p>Reex automatically generates TypeScript interfaces from the response:</p>
                        <pre><code>{`interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
}

interface GetUserResponse {
  data: User;
  status: number;
}`}</code></pre>

                        <p><strong>Copy to Clipboard:</strong></p>
                        <ul>
                            <li>Click the <strong>Copy</strong> icon to copy the interface</li>
                            <li>Paste directly into your TypeScript project</li>
                        </ul>
                        <blockquote>
                            <strong>Pro Tip:</strong> The generated interfaces are production-ready and can be used immediately in your codebase.
                        </blockquote>
                    </>
                )
            },
            {
                id: 'standalone-multiple-collections',
                title: 'Multiple Collections',
                content: (
                    <>
                        <h1>Working with Multiple Collections</h1>
                        <p>
                            Standalone Mode supports working with multiple collections simultaneously—perfect for microservices or comparing different API versions.
                        </p>

                        <h3>Managing Multiple Collections</h3>
                        <p><strong>Import Multiple Collections:</strong></p>
                        <pre><code>{`1. Import first collection (e.g., "User Service")
2. Click "Import" again
3. Import second collection (e.g., "Payment Service")
4. Both appear in sidebar`}</code></pre>

                        <p><strong>Switch Between Collections:</strong></p>
                        <ul>
                            <li>Collections are organized in separate folders</li>
                            <li>Click any collection to expand its endpoints</li>
                            <li>Each collection maintains its own base URL and auth settings</li>
                        </ul>

                        <p><strong>Example Sidebar Structure:</strong></p>
                        <pre><code>{`📁 User Service API v1
  ├── GET /users
  ├── POST /users
  └── GET /users/{id}

📁 Payment Service API v2
  ├── GET /payments
  ├── POST /payments
  └── GET /invoices

📁 Notification Service
  ├── POST /notify
  └── GET /templates`}</code></pre>

                        <h3>When to Use Standalone Mode</h3>
                        <ul>
                            <li>✅ <strong>Exploring a new API</strong> - Test before committing to integration</li>
                            <li>✅ <strong>Debugging API issues</strong> - Isolate problems without project overhead</li>
                            <li>✅ <strong>API documentation</strong> - Verify docs match actual behavior</li>
                            <li>✅ <strong>Multiple APIs</strong> - Work with several APIs at once</li>
                        </ul>

                        <h3>When to Use Project Mode</h3>
                        <ul>
                            <li>✅ <strong>Building a feature</strong> - Need generated hooks and types</li>
                            <li>✅ <strong>Production integration</strong> - Code needs to sync with project</li>
                            <li>✅ <strong>Team development</strong> - Code should be version controlled</li>
                            <li>✅ <strong>CI/CD pipelines</strong> - Generated code is part of build</li>
                        </ul>
                    </>
                )
            }
        ]
    },
    {
        id: 'test-module',
        title: 'Text Mode',
        icon: TestTube,
        content: (
            <>
                <h1>Text Mode</h1>
                <p>
                    Text Mode is built specifically for API developers who need a fast, flexible scratchpad for testing endpoints on the fly. Unlike Standalone Mode where you import existing collections, Text Mode lets you create and organize requests from scratch.
                </p>

                <h3>What is Text Mode?</h3>
                <p>
                    Text Mode is a lightweight, developer-focused environment for rapid API testing and experimentation. It's designed for situations where you need to quickly test an endpoint without the overhead of formal API specifications.
                </p>
                <p>Perfect for:</p>
                <ul>
                    <li><strong>Rapid Prototyping</strong> - Test new endpoints as you build them</li>
                    <li><strong>Quick Debugging</strong> - Isolate and test specific API calls</li>
                    <li><strong>Ad-hoc Testing</strong> - Test endpoints without importing full collections</li>
                    <li><strong>API Development</strong> - Build and organize requests as you develop your API</li>
                    <li><strong>Iterative Development</strong> - Keep refining requests until they work perfectly</li>
                </ul>
            </>
        ),
        items: [
            {
                id: 'text-getting-started',
                title: 'Getting Started',
                content: (
                    <>
                        <h1>Getting Started with Text Mode</h1>

                        <h3>Launching Text Mode</h3>
                        <p>Text Mode is available directly in the Reex API Builder web app:</p>
                        <p><strong>To use Text Mode:</strong></p>
                        <p>Visit the web app and switch to Text Mode:</p>
                        <pre><code>https://reex-api-client.vercel.app/</code></pre>
                        <p>Click <strong>Text Mode</strong> in the navigation or mode switcher.</p>

                        <h3>Switching from Other Modes</h3>
                        <p>If you're currently in Standalone Mode or Project Mode, simply click the <strong>Text Mode</strong> tab to switch.</p>
                        <blockquote>
                            <strong>Auto-save enabled:</strong> All your work in Text Mode is automatically saved in real-time. You won't lose progress even if you close the browser.
                        </blockquote>
                    </>
                )
            },
            {
                id: 'text-workflow',
                title: 'The Workflow',
                content: (
                    <>
                        <h1>The Workflow</h1>
                        <p>Text Mode follows a simple create-and-test workflow:</p>

                        <h3>Step 1: Create a Collection</h3>
                        <p>Collections help you organize related requests together.</p>
                        <p><strong>Creating Your First Collection:</strong></p>
                        <ol>
                            <li>Click the <strong>"+ New Collection"</strong> button</li>
                            <li>Enter a name (e.g., "User API Testing", "Payment Endpoints")</li>
                            <li>Click <strong>Create</strong></li>
                            <li>Collection appears in the sidebar</li>
                        </ol>
                        <blockquote>
                            <strong>Pro Tip:</strong> Create separate collections for different APIs or features to keep your workspace organized.
                        </blockquote>

                        <h3>Step 2: Create Requests</h3>
                        <p>Under each collection, you can create multiple requests to test different endpoints.</p>
                        <p><strong>Creating a Request:</strong></p>
                        <ol>
                            <li><strong>Select a collection</strong> from the sidebar</li>
                            <li>Click <strong>"+ New Request"</strong> button</li>
                            <li>Enter a name (e.g., "Get User List", "Create Payment")</li>
                            <li>The request panel opens</li>
                        </ol>
                        <p><strong>Request Structure:</strong></p>
                        <pre><code>{`📁 User API Testing
  ├── GET User List
  ├── Create User
  ├── Update User
  └── Delete User

📁 Payment Endpoints
  ├── Process Payment
  ├── Refund Payment
  └── Get Payment Status`}</code></pre>

                        <h3>Step 3: Configure the Request</h3>
                        <p>Build your request from scratch with full control over every detail.</p>

                        <h4>Set HTTP Method</h4>
                        <p>Choose from the dropdown:</p>
                        <pre><code>GET | POST | PUT | PATCH | DELETE | HEAD | OPTIONS</code></pre>

                        <h4>Enter the URL</h4>
                        <p>Type or paste the full endpoint URL:</p>
                        <pre><code>https://api.yourapp.com/users</code></pre>

                        <h4>Add Query Parameters (Optional)</h4>
                        <p>For GET requests or filtering:</p>
                        <pre><code>{`Key         | Value
------------|-------
page        | 1
limit       | 10
search      | john`}</code></pre>

                        <h4>Add Headers</h4>
                        <p>Set request headers:</p>
                        <pre><code>{`Key                  | Value
---------------------|-------------------------
Content-Type         | application/json
Authorization        | Bearer eyJhbGc...
X-Custom-Header      | custom-value`}</code></pre>

                        <h4>Add Request Body</h4>
                        <p>For POST, PUT, PATCH requests:</p>
                        <pre><code>{`{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "role": "admin"
}`}</code></pre>

                        <h4>Set Authentication</h4>
                        <ul>
                            <li>Click the <strong>Auth</strong> tab</li>
                            <li>Choose <strong>Bearer Token</strong> (currently the only implemented auth type)</li>
                            <li>Enter your token</li>
                        </ul>

                        <h3>Step 4: Send the Request</h3>
                        <p>Click the <strong>Send</strong> button to execute the request. Reex API Builder makes the request and displays the response in real-time.</p>

                        <h3>Step 5: View Response and Interface</h3>
                        <p>After sending a request, you'll see two panels:</p>

                        <h4>Response Panel</h4>
                        <p><strong>Response Body:</strong></p>
                        <pre><code>{`{
  "data": [
    {
      "id": "user_123",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "createdAt": "2025-02-07T10:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "total": 50
  }
}`}</code></pre>

                        <p><strong>Status & Timing:</strong></p>
                        <pre><code>{`Status: 200 OK
Time: 234ms
Size: 487 bytes`}</code></pre>

                        <h4>Interface Panel (TypeScript)</h4>
                        <p>Reex API Builder automatically generates TypeScript interfaces from the response:</p>
                        <pre><code>{`interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
}

interface Meta {
  page: number;
  total: number;
}

interface GetUsersResponse {
  data: User[];
  meta: Meta;
}`}</code></pre>

                        <p><strong>Copy to Clipboard:</strong></p>
                        <ul>
                            <li>Click the <strong>Copy</strong> icon to copy the interface</li>
                            <li>Paste directly into your TypeScript project</li>
                        </ul>
                        <blockquote>
                            <strong>Auto-generated:</strong> Interfaces update automatically each time you send a request with a different response structure.
                        </blockquote>
                    </>
                )
            },
            {
                id: 'text-collections',
                title: 'Multiple Collections',
                content: (
                    <>
                        <h1>Working with Multiple Collections</h1>
                        <p>
                            Text Mode excels at managing multiple collections simultaneously—perfect for working on multiple APIs or features.
                        </p>

                        <h3>Creating Multiple Collections</h3>
                        <p><strong>Add Collections:</strong></p>
                        <pre><code>{`1. Click "+ New Collection"
2. Name it (e.g., "User Service")
3. Click "+ New Collection" again
4. Name it (e.g., "Payment Service")
5. Both appear in sidebar`}</code></pre>

                        <p><strong>Organize Your Workspace:</strong></p>
                        <pre><code>{`📁 User Service
  ├── POST /register
  ├── POST /login
  ├── GET /profile
  └── PUT /profile

📁 Payment Service
  ├── POST /payments
  ├── GET /payments/{id}
  └── POST /refunds

📁 Notification Service
  ├── POST /send-email
  ├── POST /send-sms
  └── GET /templates`}</code></pre>

                        <h3>Managing Requests</h3>
                        <ul>
                            <li><strong>Rename Requests:</strong> Right-click on a request → Rename</li>
                            <li><strong>Duplicate Requests:</strong> Right-click on a request → Duplicate</li>
                            <li><strong>Delete Requests:</strong> Right-click on a request → Delete</li>
                            <li><strong>Reorder Requests:</strong> Drag and drop requests within a collection</li>
                        </ul>
                    </>
                )
            },
            {
                id: 'text-real-time-sync',
                title: 'Real-time Sync',
                content: (
                    <>
                        <h1>Real-time Sync</h1>
                        <p>Everything in Text Mode is automatically saved in real-time.</p>

                        <h3>Auto-save Features</h3>
                        <p><strong>Continuous Saving:</strong></p>
                        <ul>
                            <li>Every change is saved instantly</li>
                            <li>No manual save button needed</li>
                            <li>Status indicator shows "Saved" when synced</li>
                        </ul>

                        <p><strong>What Gets Saved:</strong></p>
                        <ul>
                            <li>Collection names and structure</li>
                            <li>Request configurations (URL, method, headers, body)</li>
                            <li>Response data and generated interfaces</li>
                            <li>Your workspace layout and preferences</li>
                        </ul>

                        <p><strong>Persistence:</strong></p>
                        <ul>
                            <li>Close the browser → Your work is saved</li>
                            <li>Refresh the page → Everything remains</li>
                            <li>Switch devices → Work syncs across sessions (when logged in)</li>
                        </ul>
                        <blockquote>
                            <strong>Browser Storage:</strong> If not logged in, your data is stored locally in your browser. Log in to sync across devices.
                        </blockquote>

                        <h3>Recovery</h3>
                        <p><strong>Never Lose Work:</strong></p>
                        <ul>
                            <li>Accidental browser close? Your work is there when you return</li>
                            <li>Internet drops? Changes sync when connection returns</li>
                            <li>Browser crash? Everything recovers on restart</li>
                        </ul>
                    </>
                )
            },
            {
                id: 'text-vs-standalone',
                title: 'Text Mode vs Standalone',
                content: (
                    <>
                        <h1>Text Mode vs. Standalone Mode</h1>

                        <h3>Comparison</h3>
                        <ul>
                            <li><strong>Collections:</strong> Text Mode creates from scratch, Standalone imports existing specs</li>
                            <li><strong>Setup:</strong> Text Mode is instant, Standalone needs file/URL import</li>
                            <li><strong>Flexibility:</strong> Text Mode offers full control, Standalone is limited to imported structure</li>
                            <li><strong>Use Case:</strong> Text Mode for building & testing new APIs, Standalone for testing existing APIs</li>
                            <li><strong>Auto-save:</strong> Text Mode has real-time sync, Standalone is session-based</li>
                            <li><strong>Best For:</strong> Text Mode for API developers, Standalone for API consumers</li>
                        </ul>

                        <h3>When to Use Text Mode</h3>
                        <ul>
                            <li>✅ <strong>Building a new API</strong> - Create and test endpoints as you develop</li>
                            <li>✅ <strong>Quick debugging</strong> - Test an endpoint without importing specs</li>
                            <li>✅ <strong>Experimental testing</strong> - Try different request configurations</li>
                            <li>✅ <strong>No API spec available</strong> - Work without Swagger/Postman files</li>
                            <li>✅ <strong>Rapid iteration</strong> - Quickly modify and retest requests</li>
                        </ul>

                        <h3>When to Use Standalone Mode</h3>
                        <ul>
                            <li>✅ <strong>Testing existing APIs</strong> - You have Swagger/OpenAPI specs</li>
                            <li>✅ <strong>Complete API exploration</strong> - Import full API documentation</li>
                            <li>✅ <strong>Team standardization</strong> - Work from shared API specs</li>
                            <li>✅ <strong>API integration</strong> - Preparing to integrate a third-party API</li>
                        </ul>
                    </>
                )
            },
            {
                id: 'text-best-practices',
                title: 'Best Practices',
                content: (
                    <>
                        <h1>Best Practices</h1>

                        <h3>Organization</h3>
                        <p><strong>Name Collections Clearly:</strong></p>
                        <pre><code>{`✅ Good: "User Service v2 - Development"
✅ Good: "Payment API - Staging Tests"
❌ Bad: "Test"
❌ Bad: "API 1"`}</code></pre>

                        <p><strong>Name Requests Descriptively:</strong></p>
                        <pre><code>{`✅ Good: "Create User - Admin Role"
✅ Good: "Get Invoice - With Line Items"
❌ Bad: "Request 1"
❌ Bad: "Test"`}</code></pre>

                        <h3>Testing Strategy</h3>
                        <p><strong>Start Simple:</strong></p>
                        <ol>
                            <li>Test basic GET endpoints first</li>
                            <li>Verify authentication works</li>
                            <li>Move to POST/PUT/DELETE</li>
                            <li>Test error cases</li>
                        </ol>

                        <p><strong>Build Incrementally:</strong></p>
                        <ul>
                            <li>Start with minimal request body</li>
                            <li>Add fields one at a time</li>
                            <li>Verify each addition works</li>
                            <li>Build up to complete request</li>
                        </ul>

                        <p><strong>Test Edge Cases:</strong></p>
                        <ul>
                            <li>Empty values</li>
                            <li>Invalid data types</li>
                            <li>Missing required fields</li>
                            <li>Boundary conditions</li>
                        </ul>

                        <h3>Workflow Efficiency</h3>
                        <p><strong>Use Request Duplication:</strong></p>
                        <ul>
                            <li>Create base request</li>
                            <li>Duplicate for variations</li>
                            <li>Test different scenarios quickly</li>
                        </ul>

                        <p><strong>Organize by Flow:</strong></p>
                        <pre><code>{`📁 User Registration Flow
  ├── 1. Register User
  ├── 2. Verify Email
  ├── 3. Complete Profile
  └── 4. Login`}</code></pre>
                    </>
                )
            }
        ]
    },
    {
        id: 'troubleshooting',
        title: 'Troubleshooting',
        icon: AlertCircle,
        content: (
            <>
                <h1>Troubleshooting</h1>

                <h3>Common Issues</h3>
                <p><strong>Issue</strong>: Generated hooks are not available in my components.</p>
                <p><strong>Solution</strong>: Ensure you've wrapped your application root with the <code>QueryProvider</code> component from <code>api-services/providers</code>.</p>

                <p><strong>Issue</strong>: API calls are failing with CORS errors.</p>
                <p><strong>Solution</strong>: Check your <code>config/constants.ts</code> to ensure the base URL is correct and that your backend has proper CORS configuration.</p>

                <p><strong>Issue</strong>: Types are out of sync after updating API definitions.</p>
                <p><strong>Solution</strong>: Re-run the analyze and update process in the Reex API Builder to regenerate types and hooks.</p>
            </>
        ),
    },
    {
        id: 'summary',
        title: 'Summary',
        icon: Book,
        content: (
            <>
                <h1>Summary</h1>
                <p>
                    Reex API Builder bridges the gap between API specifications and frontend implementation, automating the tedious parts of API integration while maintaining full type safety and developer control. By generating and maintaining the boilerplate code for you, Reex API Builder lets you focus on building great user experiences instead of wrestling with data fetching logic.
                </p>
            </>
        ),
    }
];
