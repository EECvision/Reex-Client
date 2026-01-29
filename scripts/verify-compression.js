
const zlib = require('zlib');
// Native fetch and FormData are available in Node.js 18+

async function test() {
    console.log("Creating 50MB Payload...");
    // Create a large object
    const largeData = {
        data: "x".repeat(50 * 1024 * 1024) // 50MB string
    };
    const jsonString = JSON.stringify(largeData);
    console.log(`Raw Size: ${(Buffer.byteLength(jsonString) / 1024 / 1024).toFixed(2)} MB`);

    console.log("Compressing...");
    const compressedBuffer = zlib.gzipSync(jsonString);
    console.log(`Compressed Size: ${(compressedBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Create Blob from buffer (Node 18+)
    const blob = new Blob([compressedBuffer], { type: 'application/octet-stream' });

    const form = new FormData();
    form.append('file', blob, 'large_test.json.gz');
    form.append('targetDir', 'test_dir');

    console.log("Uploading to localhost:3000/api/analyze-collection...");

    try {
        const res = await fetch('http://localhost:3000/api/analyze-collection', {
            method: 'POST',
            body: form
        });

        if (res.ok) {
            console.log("✅ SUCCESS: Server accepted the payload!");
            const data = await res.json();
            console.log("Response:", data.success ? "Analysis Successful (expected empty result for dummy data)" : data);
        } else {
            console.error(`❌ FAILED: Server returned ${res.status} ${res.statusText}`);
            const text = await res.text();
            console.error("Response:", text);
        }
    } catch (e) {
        console.error("❌ FAILED: Connection Error", e.message);
    }
}

test();
