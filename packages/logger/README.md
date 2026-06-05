# @decade/logger

Structured JSON logging. `createLogger(context, transport)` returns an
`info/warn/error` logger that merges bound context (`requestId`, `brokerId`,
`orderId`, `symbol`) into each entry. Ships a console transport.
