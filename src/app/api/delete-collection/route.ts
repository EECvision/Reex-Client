import { NextResponse, NextRequest } from "next/server";
import { getApiServicesDir } from "@/app/api/utils";



export async function POST(req: NextRequest) {
    // Body is JSON
    let targetDir = null;
    let apiServicesDir: string | undefined;

    try {
        const body = await req.json();
        targetDir = body.targetDir;
        apiServicesDir = body.apiServicesDir;
    } catch {
        // Body might be empty
    }

    // Start async task
    // On Vercel, we can't reliably fire-and-forget long tasks if we return immediately.
    // However, calculation is fast. 
    // We will return the instructions to the client.

    const API_SERVICES_DIR = getApiServicesDir(targetDir || process.env.API_TARGET_DIR || process.cwd(), apiServicesDir);

    const pathsToDelete = [
        `${API_SERVICES_DIR}/definitions`,
        `${API_SERVICES_DIR}/types`,
        `${API_SERVICES_DIR}/generated`,
        `${API_SERVICES_DIR}/index.ts`
    ];

    // Note: We cannot reset local 'src/config/apiModules.ts' on Vercel ephemeral FS reliably.
    // Ideally the app should be dynamic enough not to need it, or the Client should sync it?
    // For now, we omit the local write as it's futile on Vercel.

    return NextResponse.json({
        success: true,
        message: 'Collection reset instructions generated',
        operations: pathsToDelete.map(p => ({ type: 'delete', filePath: p }))
    });
}
