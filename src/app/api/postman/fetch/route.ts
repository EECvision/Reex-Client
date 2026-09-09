import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { apiKey, urlOrId } = body;

        if (!apiKey || !urlOrId) {
            return NextResponse.json(
                { error: "API Key and Collection URL/ID are required" },
                { status: 400 }
            );
        }

        // Extract collection ID from the string.
        // It could be a raw UUID, or a Postman web URL like:
        // https://futurecity-7743.postman.co/workspace/.../collection/51860742-3d1866e2-c6df-4d4d-bb6e-c2e6be1853da?action=...
        let collectionId = urlOrId.trim();

        if (collectionId.includes("postman.co") || collectionId.includes("getpostman.com")) {
            // Try to extract the ID after /collection/
            const match = collectionId.match(/\/collection\/([a-zA-Z0-9-]+)/);
            if (match && match[1]) {
                collectionId = match[1];
            } else {
                // If it's a direct API link (e.g. api.postman.com/collections/12345)
                const apiMatch = collectionId.match(/\/collections\/([a-zA-Z0-9-]+)/);
                if (apiMatch && apiMatch[1]) {
                    collectionId = apiMatch[1];
                } else {
                    return NextResponse.json(
                        { error: "Could not extract collection ID from the provided URL. Please provide the exact URL or the collection ID." },
                        { status: 400 }
                    );
                }
            }
        }

        // Fetch from Postman API
        const response = await fetch(`https://api.postman.com/collections/${collectionId}`, {
            method: "GET",
            headers: {
                "X-Api-Key": apiKey,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Postman API Error:", response.status, errorText);
            
            if (response.status === 401) {
                return NextResponse.json(
                    { error: "Invalid Postman API Key. Please check your key and try again." },
                    { status: 401 }
                );
            } else if (response.status === 404) {
                return NextResponse.json(
                    { error: "Collection not found. Ensure the collection ID is correct and your API key has access to it." },
                    { status: 404 }
                );
            }

            return NextResponse.json(
                { error: `Postman API returned status ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();

        if (!data || !data.collection) {
            return NextResponse.json(
                { error: "Invalid response format from Postman API. 'collection' object missing." },
                { status: 500 }
            );
        }

        // Postman API returns the collection wrapped in a `collection` property.
        // We unwrap it to match standard exported Postman JSON structure.
        return NextResponse.json(data.collection);

    } catch (error: unknown) {
        console.error("Postman Fetch Route Error:", error);
        return NextResponse.json(
            { error: "Internal server error occurred while fetching collection." },
            { status: 500 }
        );
    }
}
