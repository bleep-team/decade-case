'use client'

import { NativeSelect, NativeSelectOption } from '@decade/ui/components/native-select'

export interface SymbolSelectProps {
  /** The symbols the broker can switch between. */
  symbols: string[]
  /** The active symbol. */
  value: string
  /** Called with the newly-selected symbol. */
  onChange: (symbol: string) => void
}

/**
 * The instrument picker — a plain dropdown over the seeded symbols. Switching it
 * raises `onChange`; the terminal lifts that into its active-symbol state so the
 * price, book, and ticket all read the same instrument.
 */
export function SymbolSelect({ symbols, value, onChange }: SymbolSelectProps) {
  return (
    <NativeSelect
      aria-label="Symbol"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {symbols.map((symbol) => (
        <NativeSelectOption key={symbol} value={symbol}>
          {symbol}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  )
}
