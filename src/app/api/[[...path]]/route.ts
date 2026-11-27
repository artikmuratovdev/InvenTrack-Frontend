import serverless from 'serverless-http';
import { createApiApp } from '../../../../server';

export const runtime = 'nodejs';
export const maxDuration = 60;

let appPromise: ReturnType<typeof createApiApp> | undefined;

type GatewayEvent = {
  version: '2.0';
  routeKey: '$default';
  rawPath: string;
  rawQueryString: string;
  headers: Record<string, string>;
  requestContext: {
    http: { method: string; path: string; protocol: string; sourceIp: string; userAgent: string };
    requestId: string;
    routeKey: '$default';
    stage: '$default';
    time: string;
    timeEpoch: number;
  };
  isBase64Encoded: false;
  body?: string;
};

async function forward(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.text();
  const headers = Object.fromEntries(
    Array.from(request.headers.entries()).map(([key, value]) => [key.toLowerCase(), value]),
  );
  const now = new Date();
  const event: GatewayEvent = {
    version: '2.0',
    routeKey: '$default',
    rawPath: url.pathname,
    rawQueryString: url.search.slice(1),
    headers,
    requestContext: {
      http: {
        method,
        path: url.pathname,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: headers['user-agent'] ?? '',
      },
      requestId: crypto.randomUUID(),
      routeKey: '$default',
      stage: '$default',
      time: now.toISOString(),
      timeEpoch: now.getTime(),
    },
    isBase64Encoded: false,
    ...(body ? { body } : {}),
  };

  appPromise ??= createApiApp();
  const app = await appPromise;
  const result = (await serverless(app)(event, {} as never)) as unknown as {
    headers?: Record<string, string>;
    body?: string;
    statusCode?: number;
    isBase64Encoded?: boolean;
  };
  const responseHeaders = new Headers(result.headers as HeadersInit);
  const responseBody = result.isBase64Encoded && result.body
    ? Buffer.from(result.body, 'base64')
    : result.body ?? null;
  return new Response(responseBody, {
    status: result.statusCode ?? 200,
    headers: responseHeaders,
  });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
