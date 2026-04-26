'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { useAuthStore } from '@/lib/store'
import { getSocket } from '@/lib/socket'
import AppLayout from '@/components/layout/AppLayout'
import api from '@/lib/api'

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

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const colors = ['bg-purple-100 text-purple-700', 'bg-blue-100 text-blue-700',
    'bg-orange-100 text-orange-700', 'bg-pink-100 text-pink-700', 'bg-teal-100 text-teal-700']
  const color = colors[name.charCodeAt(0) % colors.length]
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' }
  return (
    <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function TransactionRow({ tx, userId }: { tx: Transaction; userId: string }) {
  const isSender = tx.sender._id === userId
  const other = isSender ? tx.receiver : tx.sender
  const sign = isSender ? '-' : '+'
  const color = isSender ? 'text-gray-900' : 'text-brand-600'

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-xl px-2 -mx-2 transition-colors">
      <Avatar name={other.name} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{other.name}</p>
        <p className="text-xs text-gray-400 truncate">{tx.note || other.upiId}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-semibold ${color}`}>
          {sign}₹{tx.amount.toLocaleString('en-IN')}
        </p>
        <p className="text-xs text-gray-400">{format(new Date(tx.createdAt), 'd MMM, h:mm a')}</p>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
        tx.status === 'success' ? 'badge-success' :
        tx.status === 'failed' ? 'badge-failed' : 'badge-pending'
      }`}>{tx.status}</span>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="w-10 h-10 rounded-full shimmer flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-28 rounded shimmer" />
        <div className="h-2.5 w-20 rounded shimmer" />
      </div>
      <div className="h-3 w-14 rounded shimmer" />
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, token, updateBalance } = useAuthStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [notifCount, setNotifCount] = useState(0)
  const [showBalance, setShowBalance] = useState(true)

  const fetchRecent = useCallback(async () => {
    try {
      const { data } = await api.get('/transactions/history?limit=5')
      setTransactions(data.transactions)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!token) { router.replace('/login'); return }
    fetchRecent()
  }, [token, router, fetchRecent])

  // Real-time: listen for incoming money
  useEffect(() => {
    if (!user) return
    const socket = getSocket()

    socket.on('transaction:received', (data) => {
      setNotifCount((n) => n + 1)
      updateBalance(data.newBalance)
      fetchRecent()

      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-slide-up' : 'opacity-0'} bg-white shadow-xl rounded-2xl p-4 flex gap-3 items-start border border-green-100 max-w-sm`}>
          <div className="w-10 h-10 bg-brand-50 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Money Received! 🎉</p>
            <p className="text-xs text-gray-500 mt-0.5">
              <span className="font-medium text-brand-600">+₹{data.amount.toLocaleString('en-IN')}</span> from {data.from}
            </p>
            {data.note && <p className="text-xs text-gray-400 mt-0.5">"{data.note}"</p>}
          </div>
        </div>
      ), { duration: 5000 })
    })

    return () => { socket.off('transaction:received') }
  }, [user, updateBalance, fetchRecent])

  if (!user) return null

  const stats = {
    sent: transactions.filter(t => t.sender._id === user._id && t.status === 'success')
      .reduce((s, t) => s + t.amount, 0),
    received: transactions.filter(t => t.receiver._id === user._id && t.status === 'success')
      .reduce((s, t) => s + t.amount, 0),
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-5 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},</p>
            <h1 className="text-xl font-semibold text-gray-900">{user.name.split(' ')[0]} 👋</h1>
          </div>
          <button
            onClick={() => setNotifCount(0)}
            className="relative w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium animate-ping-slow">
                {notifCount}
              </span>
            )}
          </button>
        </div>

        {/* Balance card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white shadow-lg shadow-brand-200">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-brand-100 font-medium">Total Balance</p>
              <button onClick={() => setShowBalance(b => !b)} className="text-brand-200 hover:text-white transition-colors">
                {showBalance ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-4xl font-bold tracking-tight mb-1">
              {showBalance
                ? `₹${user.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                : '₹ ••••••'}
            </p>
            <p className="text-sm text-brand-200 font-mono">{user.upiId}</p>

            <div className="flex gap-4 mt-5 pt-4 border-t border-white/10">
              <div>
                <p className="text-xs text-brand-200">Sent (recent)</p>
                <p className="text-sm font-semibold">₹{stats.sent.toLocaleString('en-IN')}</p>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <p className="text-xs text-brand-200">Received (recent)</p>
                <p className="text-sm font-semibold text-green-300">₹{stats.received.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { href: '/send', label: 'Send Money', bg: 'bg-brand-50', text: 'text-brand-700',
              icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /> },
            { href: '/send?tab=request', label: 'Request', bg: 'bg-purple-50', text: 'text-purple-700',
              icon: <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /> },
            { href: '/history', label: 'History', bg: 'bg-orange-50', text: 'text-orange-700',
              icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /> },
          ].map((action) => (
            <Link key={action.href} href={action.href}
              className={`${action.bg} rounded-2xl p-4 flex flex-col items-center gap-2 hover:opacity-80 active:scale-95 transition-all`}>
              <div className={`w-10 h-10 ${action.bg} rounded-xl flex items-center justify-center`}>
                <svg className={`w-5 h-5 ${action.text}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  {action.icon}
                </svg>
              </div>
              <span className={`text-xs font-medium ${action.text}`}>{action.label}</span>
            </Link>
          ))}
        </div>

        {/* Recent transactions */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Recent Transactions</h2>
            <Link href="/history" className="text-xs text-brand-600 hover:underline font-medium">View all</Link>
          </div>
          {loading ? (
            <div className="space-y-1">{[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">No transactions yet</p>
              <Link href="/send" className="text-xs text-brand-600 hover:underline mt-1 block">Send your first payment</Link>
            </div>
          ) : (
            <div>{transactions.map(tx => <TransactionRow key={tx._id} tx={tx} userId={user._id} />)}</div>
          )}
        </div>

      </div>
    </AppLayout>
  )
}
