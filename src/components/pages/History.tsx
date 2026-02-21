import { Trash2, Calendar, Search, FileText } from "lucide-react"
import type { HistoryItem } from "../../lib/types"
import { formatCurrency } from "../../lib/utils"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { generateLoanReport } from "../../lib/pdfGenerator"

interface HistoryProps {
    history: HistoryItem[]
    onViewDetails: (item: HistoryItem) => void
    onDelete: (id: string) => void
    onClear: () => void
}

export const History = ({ history, onViewDetails, onDelete, onClear }: HistoryProps) => {
    if (history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="bg-muted rounded-full p-6 mb-4">
                    <Calendar className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">No applications yet</h2>
                <p className="text-muted-foreground max-w-md">
                    Once you complete a loan eligibility check, it will appear here for your reference.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between border-b border-border pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Application History</h1>
                    <p className="text-muted-foreground mt-1">Review and manage your past loan predictions.</p>
                </div>
                <Button variant="outline" size="sm" onClick={onClear} className="text-destructive hover:text-destructive">
                    Clear All
                </Button>
            </div>

            <div className="grid gap-6">
                {history.map((item) => (
                    <Card key={item.id} className="overflow-hidden group transition-all hover:border-foreground/20">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="space-y-1">
                                <CardTitle className="text-xl capitalize">
                                    {item.loanType} Loan
                                </CardTitle>
                                <CardDescription className="flex items-center gap-2">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(item.date).toLocaleDateString()} at {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </CardDescription>
                            </div>
                            <Badge variant={item.result.approved ? "success" : "destructive"} className="px-3 py-1">
                                {item.result.approved ? "Approved" : "Rejected"}
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-2">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase font-semibold">Requested</p>
                                        <p className="font-mono text-lg">{formatCurrency(item.result.loan_amount_requested, item.currency)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase font-semibold">Score</p>
                                        <p className="text-lg">{item.result.breakdown.credit_profile.credit_score}</p>
                                    </div>
                                    <div className="hidden sm:block">
                                        <p className="text-xs text-muted-foreground uppercase font-semibold">Confidence</p>
                                        <p className="text-lg">{item.result.approval_probability.toFixed(1)}%</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onViewDetails(item)}
                                        className="gap-2"
                                    >
                                        <Search className="h-4 w-4" />
                                        View
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => generateLoanReport(item.result, item.loanType)}
                                        className="gap-2"
                                    >
                                        <FileText className="h-4 w-4" />
                                        PDF
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onDelete(item.id)}
                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
