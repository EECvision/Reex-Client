import { NextRequest, NextResponse } from 'next/server';
import { eventEmitter } from '@/app/api/utils';

export async function GET(req: NextRequest) {
    const stream = new ReadableStream({
        start(controller) {
            const listener = (data: any) => {
                const payload = `data: ${JSON.stringify(data)}\n\n`;
                controller.enqueue(new TextEncoder().encode(payload));
            };

            eventEmitter.on('event', listener);

            // Cleanup when stream is canceled (client disconnects)
            // Note: return logic for start() is void or promise
            // We use a closure for cleanup since ReadableStream api is tricky with external events
            req.signal.addEventListener('abort', () => {
                eventEmitter.off('event', listener);
            });
        }
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}

// Next.js requires this for SSE potentially?
export const dynamic = 'force-dynamic';
