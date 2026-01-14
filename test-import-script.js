const fs = require('fs');

async function test() {
    let FormDataConstructor = global.FormData;
    if (!FormDataConstructor) {
        try {
            FormDataConstructor = (await import('form-data')).default;
        } catch (e) {
            console.log("No global FormData and form-data package missing. Attempting simple boundary...");
            // Manual boundary construction if needed, but risky.
            // Let's assume Node 18+ has fetch, maybe FormData?
            // Actually, Node 18 has fetch but FormData is recent.
        }
    }

    // Fallback if still missing (Node <18 or no form-data)
    if (!FormDataConstructor) {
        console.error("Please ensure Node 18+ or install form-data.");
        return;
    }

    const form = new FormDataConstructor();
    const mockSpec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
            '/test-endpoint': {
                get: {
                    operationId: 'get_test',
                    responses: { '200': { description: 'ok' } }
                }
            }
        }
    };

    fs.writeFileSync('temp_spec.json', JSON.stringify(mockSpec));

    if (form.append) {
        // Node native FormData or form-data package
        // Note: form-data package needs createReadStream, native needs Blob/File
        // Check constructor name?
        if (FormDataConstructor.name === 'FormData' && typeof Blob !== 'undefined') {
            // Native
            const blob = new Blob([fs.readFileSync('temp_spec.json')], { type: 'application/json' });
            form.append('file', blob, 'temp_spec.json');
        } else {
            // form-data package
            form.append('file', fs.createReadStream('temp_spec.json'));
        }
        form.append('targetDir', 'placeholder');
    }

    console.log('Sending request to Client...');

    // Native fetch
    const res = await fetch('http://localhost:3000/api/update-collection', {
        method: 'POST',
        // form-data package requires headers? native fetch handles it with FormData
        headers: form.getHeaders ? form.getHeaders() : undefined,
        body: form
    });

    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body:', text);
}
test().catch(console.error);
