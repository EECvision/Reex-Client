import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import yaml from "js-yaml";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { url } = body;


        const response = await axios.get(url, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json, text/plain, */*'
            }
        });

        let data = response.data;

        // If it's a string, attempt to parse it as YAML (which also handles JSON)
        if (typeof data === 'string') {
            try {
                data = yaml.load(data);
            } catch (e) {
                console.warn(`[FETCH-URL] Could not parse response string as YAML/JSON:`, e);
            }
        }

        // If OpenAPI spec has no servers, inject one from the source URL
        if (data && typeof data === 'object' && (data.openapi || data.swagger) && !data.servers && !data.host) {
            try {
                const sourceUrl = new URL(url);
                const baseUrl = `${sourceUrl.protocol}//${sourceUrl.host}`;
                console.log(`[FETCH-URL] Injecting servers array with baseURL: ${baseUrl}`);
                data.servers = [{ url: baseUrl }];
            } catch (e) {
                console.warn(`[FETCH-URL] Could not parse source URL for servers injection:`, e);
            }
        }

        return NextResponse.json(data);

    } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[SERVER] Fetch error:`, errorMessage);
        if (typeof error === 'object' && error !== null && 'code' in error && (error as Record<string, unknown>).code === 'ECONNABORTED') {
            return NextResponse.json({ error: "Fetch timed out after 10s" }, { status: 504 });
        }
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
