# @decade/mcp

An MCP server that exposes the exchange REST API as tools, so an LLM client can
submit orders and read the book/price/balances.

```ts
import { createExchangeMcpServer } from '@decade/mcp'

const server = createExchangeMcpServer({ baseUrl: 'https://decade.usebleep.com', apiKey })
```

Tools: `submit_order`, `get_order`, `get_order_book`, `get_price`,
`get_broker_balance`. The app mounts this behind a transport at `/api/mcp`.
