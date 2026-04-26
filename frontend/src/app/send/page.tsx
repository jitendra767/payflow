'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import AppLayout from '@/components/layout/AppLayout'
import { useAuthStore } from '@/lib/store'
import api from '@/lib/api'

type Step = 'search' | 'amount' | 'mpin' | 'success'

interface Receiver {
  _id: string
  name: string
  upiId: string
  phone: string
}

interface Receipt {
  transactionId: string
  amount: number
  receiver: string
  note: string
  newBalance: number
}

function StepIndicator({ current }: { current: Step }) {
  const steps: Step[] = ['search', 'amount', 'mpin', 'success']
  const labels = ['Find', 'Amount', 'Confirm', 'Done']
  const idx = steps.indexOf(current)
  return (
    <div className="flex items-center gap-1 mb-6">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1 flex-1">
          <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-all
            ${i < idx ? 'bg-brand-600 text-white' :
              i === idx ? 'bg-brand-600 text-white ring-4 ring-brand-100' :
              'bg-gray-100 text-gray-400'}`}>
            {i < idx ? '✓' : i + 1}
          </div>
          <span className={`text-xs flex-1 ${i === idx ? 'text-brand-600 font-medium' : 'text-gray-400'}`}>{labels[i]}</span>
          {i < steps.length - 1 && <div className={`h-px flex-1 ${i < idx ? 'bg-brand-400' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  )
}

function MpinInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const digits = value.padEnd(6, '')

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const newVal = value.slice(0, -1)
      onChange(newVal)
      if (i > 0) inputs.current[i - 1]?.focus()
    }
  }

  const handleInput = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const char = e.target.value.replace(/\D/g, '').slice(-1)
    if (!char) return
    const newVal = (value + char).slice(0, 6)
    onChange(newVal)
    if (i < 5 && char) inputs.current[i + 1]?.focus()
  }

  return (
    <div className="flex justify-center gap-3 my-6">
      {[...Array(6)].map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el }}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] !== ' ' ? digits[i] : ''}
          onChange={(e) => handleInput(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onFocus={() => {}}
          className="w-11 h-12 text-center text-xl font-bold border-2 rounded-xl focus:outline-none focus:border-brand-500 transition-colors bg-gray-50 focus:bg-white"
          style={{ borderColor: digits[i] !== ' ' && digits[i] ? '#1a8456' : undefined }}
        />
      ))}
    </div>
  )
}

export default function SendPage() {
  const router = useRouter()
  const { user, token, updateBalance } = useAuthStore()
  const [step, setStep] = useState<Step>('search')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [receiver, setReceiver] = useState<Receiver | null>(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [mpin, setMpin] = useState('')
  const [sending, setSending] = useState(false)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const searchTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => { if (!token) router.replace('/login') }, [token, router])

  // Auto search with debounce
  useEffect(() => {
    if (query.length < 3) { setReceiver(null); return }
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const { data } = await api.get(`/users/search?q=${encodeURIComponent(query)}`)
        setReceiver(data)
      } catch {
        setReceiver(null)
      } finally {
        setSearching(false)
      }
    }, 500)
  }, [query])

  const handleSend = async () => {
    if (mpin.length !== 6) { toast.error('Enter your 6-digit MPIN'); return }
    setSending(true)
    try {
      const { data } = await api.post('/transactions/send', {
        receiverUpiId: receiver!.upiId,
        amount: parseFloat(amount),
        note,
        mpin,
      })
      updateBalance(data.newBalance)
      setReceipt({
        transactionId: data.transaction.transactionId,
        amount: parseFloat(amount),
        receiver: receiver!.name,
        note,
        newBalance: data.newBalance,
      })
      setStep('success')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Payment failed')
      setMpin('')
    } finally {
      setSending(false)
    }
  }

  const reset = () => {
    setStep('search'); setQuery(''); setReceiver(null)
    setAmount(''); setNote(''); setMpin(''); setReceipt(null)
  }

  const quickAmounts = [100, 200, 500, 1000, 2000]

  return (
    <AppLayout>
      <div className="max-w-md mx-auto p-4 md:p-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          {step !== 'search' && step !== 'success' && (
            <button onClick={() => setStep(step === 'mpin' ? 'amount' : 'search')}
              className="w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h1 className="text-xl font-semibold text-gray-900">Send Money</h1>
        </div>

        {step !== 'success' && <StepIndicator current={step} />}

        {/* STEP 1 — Search */}
        {step === 'search' && (
          <div className="card p-6 space-y-4 animate-slide-up">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">UPI ID or Mobile Number</label>
              <div className="relative">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="input-field pr-10"
                  placeholder="name@payflow or 9876543210"
                  autoFocus
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="animate-spin h-4 w-4 text-brand-500" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {receiver && (
              <div className="border border-brand-100 bg-brand-50 rounded-xl p-4 flex items-center gap-3 animate-slide-up">
                <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center font-semibold text-brand-700 flex-shrink-0">
                  {receiver.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{receiver.name}</p>
                  <p className="text-xs text-gray-500 font-mono truncate">{receiver.upiId}</p>
                </div>
                <button
                  onClick={() => setStep('amount')}
                  className="btn-primary text-sm px-4 py-2">
                  Pay
                </button>
              </div>
            )}

            {query.length >= 3 && !searching && !receiver && (
              <p className="text-sm text-center text-gray-400 py-4">No user found with this UPI ID or phone number</p>
            )}
          </div>
        )}

        {/* STEP 2 — Amount */}
        {step === 'amount' && receiver && (
          <div className="space-y-4 animate-slide-up">
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center font-semibold text-brand-700">
                {receiver.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{receiver.name}</p>
                <p className="text-xs text-gray-500 font-mono">{receiver.upiId}</p>
              </div>
            </div>

            <div className="card p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₹</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input-field pl-8 text-xl font-semibold"
                    placeholder="0"
                    min="1"
                    max="100000"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Your balance: ₹{user?.balance.toLocaleString('en-IN')}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {quickAmounts.map((q) => (
                  <button key={q} onClick={() => setAmount(q.toString())}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                      ${amount === q.toString() ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    ₹{q.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Note (optional)</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="input-field"
                  placeholder="e.g. Dinner split, Rent, etc."
                  maxLength={100}
                />
              </div>

              <button
                onClick={() => {
                  if (!amount || parseFloat(amount) < 1) { toast.error('Enter a valid amount'); return }
                  if (parseFloat(amount) > (user?.balance ?? 0)) { toast.error('Insufficient balance'); return }
                  setStep('mpin')
                }}
                className="btn-primary w-full">
                Proceed to Pay
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — MPIN */}
        {step === 'mpin' && receiver && (
          <div className="card p-6 animate-slide-up">
            <div className="text-center mb-2">
              <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-brand-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-gray-900">Enter MPIN</h2>
              <p className="text-sm text-gray-500 mt-1">
                Paying <span className="font-medium text-gray-700">₹{parseFloat(amount).toLocaleString('en-IN')}</span> to{' '}
                <span className="font-medium text-gray-700">{receiver.name}</span>
              </p>
            </div>

            <MpinInput value={mpin} onChange={setMpin} />

            <button
              onClick={handleSend}
              disabled={sending || mpin.length !== 6}
              className="btn-primary w-full">
              {sending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                  </svg>
                  Processing...
                </span>
              ) : `Pay ₹${parseFloat(amount || '0').toLocaleString('en-IN')}`}
            </button>
          </div>
        )}

        {/* STEP 4 — Success */}
        {step === 'success' && receipt && (
          <div className="card p-8 text-center animate-slide-up">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Payment Successful!</h2>
            <p className="text-3xl font-bold text-brand-600 my-3">₹{receipt.amount.toLocaleString('en-IN')}</p>
            <p className="text-sm text-gray-500 mb-6">Sent to <span className="font-medium text-gray-700">{receipt.receiver}</span></p>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-left mb-6">
              {[
                ['Transaction ID', receipt.transactionId],
                ['Note', receipt.note || '—'],
                ['New Balance', `₹${receipt.newBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-800 font-mono text-xs">{value}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={reset} className="btn-ghost flex-1 text-sm">Send Again</button>
              <button onClick={() => router.push('/dashboard')} className="btn-primary flex-1 text-sm">Go Home</button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
