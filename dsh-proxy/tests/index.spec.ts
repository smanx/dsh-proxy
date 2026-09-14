import http from 'node:http'
import type { AddressInfo } from 'node:net'
import type { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import { apply } from '../src/index.ts'

const servers: http.Server[] = []

afterEach(async () => {
  for (const server of servers.splice(0)) {
    await new Promise<void>((resolve) => {
      server.closeAllConnections()
      server.close(() => resolve())
    })
  }
})

describe('host plugin RPC route', () => {
  it('serves the settings status endpoint with a Connection response envelope', async () => {
    let route: { handler: (req: http.IncomingMessage, res: http.ServerResponse) => void | Promise<void> } | undefined
    const webServer = {
      port: 3080,
      register: (next: typeof route) => {
        route = next
        return () => { route = undefined }
      },
    }
    const connection = {
      authenticatedUrl: (baseUrl: string) => `${baseUrl}/?token=fixture-token`,
      requestRejection: () => undefined,
    }
    const ctx = {
      webServer,
      connection,
      logger: { info: () => {}, warn: () => {}, error: () => {} },
      effect: () => () => {},
      inject: (_services: string[], callback: (injected: unknown) => unknown) => {
        callback(ctx)
        return undefined
      },
    } as unknown as Context

    await apply(ctx, { listenHost: '127.0.0.1', listenPort: 0 } as never)
    expect(route).toBeDefined()

    // 使用真实 Node HTTP 对象验证浏览器发送的 POST 信封和服务端响应字段。
    const server = http.createServer((req, res) => route?.handler(req, res))
    servers.push(server)
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const port = (server.address() as AddressInfo).port
    const response = await fetch(`http://127.0.0.1:${String(port)}/dsh-proxy/status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'client-request',
        rpcId: 'fixture-rpc',
        method: 'status',
        payload: {},
      }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      type: 'server-response',
      rpcId: 'fixture-rpc',
      result: { ok: true },
    })
  })
})
