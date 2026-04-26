'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import AppLayout from '@/components/layout/AppLayout'
import { useAuthStore } from '@/lib/store'
import api from '@/lib/api'

type Filter = 'all' | 'sent' | 'received'

interface Transaction {
  _id: string
  transactionId: string
  sender: { _id: string; name: string; upiId: string }
  receiver: { _id: string; name: string; upiId: string }
  amount: number
  note: string
  status: string
  createdAt: string
}

function Avatar({ name }: { name: string }) {
  const colors = ['bg-purple-100 text-purple-700', 'bg-blue-100 text-blue-700',
    'bg-orange-100 text-orange-700', 'bg-pink-100 text-pink-700', 'bg-teal-100 text-teal-700']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div className={`w-11 h-11 ${color} rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

export default function HistoryPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => { if (!token) router.replace('/login') }, [token, router])

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '15' })
      if (filter !== 'all') params.append('type', filter)
      const { data } = await api.get(`/transactions/history?${params}`)
      setTransactions(data.transactions)
      setTotalPages(data.totalPages)
      setTotal(data.total)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [page, filter])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  const handleFilterChange = (f: Filter) => {
    setFilter(f)
    setPage(1)
  }

  const grouped = transactions.reduce((acc: Record<string, Transaction[]>, tx) => {
    const key = format(new Date(tx.createdAt), 'EEEE, d MMMM yyyy')
    if (!acc[key]) acc[key] = []
    acc[key].push(tx)
    return acc
  }, {})

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4 md:p-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Transaction History</h1>
            <p className="text-xs text-gray-400 mt-0.5">{total} total transactions</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-5">
          {(['all', 'sent', 'received'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize
                ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {f}
            </button>
          ))}
        </div>

        {/* Transactions */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card p-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full shimmer flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-32 rounded shimmer" />
                  <div className="h-2.5 w-24 rounded shimmer" />
                </div>
                <div className="space-y-2">
                  <div className="h-3.5 w-16 rounded shimmer" />
                  <div className="h-2.5 w-12 rounded shimmer ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No transactions found</p>
            <p className="text-sm text-gray-400 mt-1">
              {filter !== 'all' ? `No ${filter} transactions yet` : 'Start sending money to see your history'}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(grouped).map(([date, txs]) => (
              <div key={date}>
                <p className="text-xs font-medium text-gray-400 mb-2 px-1">{date}</p>
                <div className="card divide-y divide-gray-50">
                  {txs.map((tx) => {
                    const isSender = tx.sender._id === user?._id
                    const other = isSender ? tx.receiver : tx.sender
                    return (
                      <div key={tx._id} className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
                        <div className="relative">
                          <Avatar name={other.name} />
                          <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center
                            ${isSender ? 'bg-orange-100' : 'bg-green-100'}`}>
                            <svg className={`w-2.5 h-2.5 ${isSender ? 'text-orange-500 rotate-45' : 'text-green-500 -rotate-45'}`}
                              fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{other.name}</p>
                          <p className="text-xs text-gray-400 truncate mt-0.5">{tx.note || tx.transactionId}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{format(new Date(tx.createdAt), 'h:mm a')}</p>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className={`text-sm font-bold ${isSender ? 'text-gray-900' : 'text-brand-600'}`}>
                            {isSender ? '-' : '+'}₹{tx.amount.toLocaleString('en-IN')}
                          </p>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            tx.status === 'success' ? 'badge-success' :
                            tx.status === 'failed' ? 'badge-failed' : 'badge-pending'
                          }`}>{tx.status}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-white border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">
                  Previous
                </button>
                <span className="text-sm text-gray-500 px-2">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-white border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
