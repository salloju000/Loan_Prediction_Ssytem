import { Globe } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from './dropdown-menu'
import { Button } from './button'
import type { CurrencyCode } from '../../lib/types'

interface CurrencySelectorProps {
    current: CurrencyCode
    onChange: (code: CurrencyCode) => void
}

const currencies: { code: CurrencyCode; name: string; symbol: string }[] = [
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
]

export function CurrencySelector({ current, onChange }: CurrencySelectorProps) {
    const selected = currencies.find(c => c.code === current) || currencies[0]

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 px-3 gap-2 text-muted-foreground hover:text-foreground border border-border bg-card">
                    <Globe className="h-4 w-4" />
                    <span className="font-medium text-xs">{selected.symbol} {selected.code}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
                {currencies.map((currency) => (
                    <DropdownMenuItem
                        key={currency.code}
                        onClick={() => onChange(currency.code)}
                        className="flex items-center justify-between cursor-pointer"
                    >
                        <span>{currency.name}</span>
                        <span className="text-muted-foreground font-mono">{currency.symbol}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
