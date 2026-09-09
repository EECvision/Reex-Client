
import fs from 'fs';
import path from 'path';
import { exec, ExecOptions } from 'child_process';

interface ExecutionResult {
    success?: boolean;
    data?: unknown;
    rawOutput?: string;
}

class ExecutionService {

    async executeFunction(targetDir: string, apiKey: string, fnName: string, args: unknown[] = []): Promise<ExecutionResult> {
        // targetDir is .../src/api-services/definitions

        const scriptPath = path.join(targetDir, `temp_exec_${Date.now()}.js`);
        const moduleName = apiKey; // 'users', 'auth' etc.

        const varName = `${moduleName}Api`;

        // Use CJS require
        const scriptContent = `
const { ${varName} } = require('./${moduleName}');

(async () => {
    try {
        console.log("EXECUTION_START");
        // args is an array. We spread it.
        const args = ${JSON.stringify(args)};
        const fn = ${varName}.${fnName};
        
        if (!fn) {
            throw new Error("Function ${fnName} not found in ${varName}");
        }

        const result = await fn(...args);
        console.log("EXECUTION_RESULT:" + JSON.stringify(result));
    } catch (e) {
        console.log("EXECUTION_ERROR:" + (e.message || String(e)));
        if (e.response) {
             console.log("RESPONSE_STATUS:" + e.response.status);
             console.log("RESPONSE_DATA:" + JSON.stringify(e.response.data));
        }
    }
})();
`;

        try {
            fs.writeFileSync(scriptPath, scriptContent);

            // Run with ts-node in CJS mode
            // We force commonjs module output via ENV to avoid shell quoting issues.
            const env: NodeJS.ProcessEnv = {
                ...process.env,
                TS_NODE_COMPILER_OPTIONS: JSON.stringify({ module: "commonjs", noEmit: false }),
                TS_NODE_TRANSPILE_ONLY: "true",
                TS_NODE_IGNORE_DIAGNOSTICS: "5095"
            };

            const output = await this.runCommand(`npx ts-node "${scriptPath}"`, { cwd: targetDir, env });

            // Parse output
            const lines = output.split('\n');
            const resultLine = lines.find(l => l.startsWith('EXECUTION_RESULT:'));
            const errorLine = lines.find(l => l.startsWith('EXECUTION_ERROR:'));

            if (errorLine) {
                const errorMsg = errorLine.replace('EXECUTION_ERROR:', '');
                const responseData = lines.find(l => l.startsWith('RESPONSE_DATA:'));
                const helpfulError = responseData ? JSON.parse(responseData.replace('RESPONSE_DATA:', '')) : errorMsg;
                throw new Error(typeof helpfulError === 'string' ? helpfulError : JSON.stringify(helpfulError));
            }

            if (resultLine) {
                return JSON.parse(resultLine.replace('EXECUTION_RESULT:', ''));
            }

            return { success: true, rawOutput: output }; // Fallback

        } finally {
            if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
        }
    }

    runCommand(cmd: string, options: ExecOptions): Promise<string> {
        return new Promise((resolve, reject) => {
            exec(cmd, options, (err, stdout, stderr) => {
                if (err) {
                    // Start of exec might fail, or script might fail.
                    // If script ran but printed error, stdout handles it.
                    // If ts-node failed (compile error), stderr has it.
                    return reject(stderr || err.message);
                }
                resolve(stdout as string);
            });
        });
    }
}

const executionService = new ExecutionService();
export default executionService;
