import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

/**
 * Simple HTTP proxy for standalone mode.
 * Executes the actual system `curl` command to bypass CORS and mimic terminal behavior.
 */
const getCurlErrorMessage = (code: number | null): string => {
    switch (code) {
        case 1: return "Unsupported protocol.";
        case 3: return "URL malformat. The syntax was not correct.";
        case 6: return "Couldn't resolve host. The given remote host was not resolved.";
        case 7: return "Failed to connect to host.";
        case 28: return "Operation timeout. The specified time-out period was reached.";
        case 35: return "A problem occurred somewhere in the SSL/TLS handshake.";
        case 52: return "Nothing was returned from the server.";
        case 60: return "Peer certificate cannot be authenticated with known CA certificates.";
        default: return "Unknown curl error.";
    }
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { method, data, headers } = body;
        const url = (body.url || "").trim();

        if (!url) {
            return NextResponse.json({ success: false, error: "URL is required" }, { status: 400 });
        }

        // Prepare Curl Arguments
        const args: string[] = [
            '-s', // Silent mode (don't show progress meter)
            '-S', // Show error message if it fails
            '-X', method?.toUpperCase() || 'GET',
            '-w', '\n%{http_code}', // Write HTTP status code at the end
            '--connect-timeout', '10', // 10s connection timeout
            '--max-time', '60' // 60s total time limit
        ];

        // Headers
        const requestHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...headers
        };

        Object.entries(requestHeaders).forEach(([key, value]) => {
            args.push('-H', `${key}: ${value}`);
        });

        // Body
        if (data && method?.toUpperCase() !== 'GET' && method?.toUpperCase() !== 'HEAD') {
            const payload = typeof data === 'string' ? data : JSON.stringify(data);
            // Use --data-raw to prevent @file interpretation which could leak server files
            args.push('--data-raw', payload);
        }

        // URL (Last argument)
        args.push(url);

        // Execute Curl
        // We use spawn directly to avoid shell injection vulnerabilities
        return new Promise<NextResponse>((resolve) => {
            const child = spawn('curl', args);

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (chunk) => {
                stdout += chunk.toString();
            });

            child.stderr.on('data', (chunk) => {
                stderr += chunk.toString();
            });

            child.on('close', (code) => {
                if (code !== 0) {
                    const description = getCurlErrorMessage(code);
                    const errorDetails = stderr.trim() ? `Details: ${stderr.trim()}` : '';
                    console.error("Curl Error:", stderr);
                    resolve(NextResponse.json({
                        success: false,
                        error: `Curl command failed with code ${code} (${description}). ${errorDetails}`.trim()
                    }, { status: 500 }));
                    return;
                }

                // Parse Output
                // The last line is the status code due to -w '\n%{http_code}'
                const lastNewlineIndex = stdout.lastIndexOf('\n');
                if (lastNewlineIndex === -1) {
                    // Fallback if something went weird, though -w guarantees it
                    resolve(NextResponse.json({ success: false, error: "Invalid curl output" }, { status: 502 }));
                    return;
                }

                const responseBody = stdout.substring(0, lastNewlineIndex);
                const statusCodeStr = stdout.substring(lastNewlineIndex + 1).trim();
                const statusCode = parseInt(statusCodeStr, 10) || 200;

                let parsedData;
                try {
                    parsedData = JSON.parse(responseBody);
                } catch {
                    parsedData = responseBody;
                }

                if (statusCode >= 400) {
                    const errorMessage =
                        (typeof parsedData === 'object' && parsedData?.message) ||
                        (typeof parsedData === 'object' && JSON.stringify(parsedData)) ||
                        parsedData ||
                        `Error ${statusCode}`;

                    resolve(NextResponse.json({ success: false, error: errorMessage }, { status: statusCode }));
                } else {
                    resolve(NextResponse.json({ success: true, data: parsedData }));
                }
            });

            child.on('error', (err) => {
                console.error("Failed to spawn curl:", err);
                resolve(NextResponse.json({ success: false, error: "Failed to execute curl command. Is curl installed?" }, { status: 500 }));
            });
        });

    } catch (e: any) {
        console.error("Proxy Error:", e);
        return NextResponse.json({ success: false, error: e.message || String(e) }, { status: 500 });
    }
}
