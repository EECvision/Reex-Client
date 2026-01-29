import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

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

        const data = response.data;

        // If OpenAPI spec has no servers, inject one from the source URL
        if ((data.openapi || data.swagger) && !data.servers && !data.host) {
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

    } catch (error: any) {
        console.error(`[SERVER] Fetch error:`, error.message);
        if (error.code === 'ECONNABORTED') {
            return NextResponse.json({ error: "Fetch timed out after 10s" }, { status: 504 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
