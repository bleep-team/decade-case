# @decade/mcp

An MCP server that exposes the exchange as tools, so an LLM client can submit
orders and read the book/price/balances. The tools own no business logic: they
distil the caller's identity from the transport's auth (a Clerk **OAuth** user or
a forwarded **API key**) and dispatch to a host-supplied `ExchangeToolBackend`,
which resolves the broker and runs the same broker-scoped service the REST routes
use. The acting broker always comes from the identity — never the tool arguments.

```ts
import { createExchangeMcpServer, registerExchangeTools } from '@decade/mcp'

// `backend` resolves the broker from the identity and runs the shared service.
const server = createExchangeMcpServer(backend)
// or register onto an existing server (e.g. behind a Streamable-HTTP transport):
registerExchangeTools(existingServer, backend)
```

Identity helpers (`identityFromExtra`, `bearerFromExtra`, `userIdFromExtra`) read
the OAuth user id and forwarded bearer out of a tool call's `extra`.

Tools: `submit_order`, `get_order`, `get_order_book`, `get_price`,
`get_broker_balance`. The app mounts this behind a transport at `/api/mcp`, where
it accepts both a Clerk OAuth token (native add-by-URL connector) and an API-key
bearer (`mcp-remote`).
