'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import AppLayout from '@/components/layout/AppLayout'
import { useAuthStore } from '@/lib/store'
import api from '@/lib/api'

export default function ProfilePage() {
  const router = useRouter()
  const { user, token, logout, updateUser } = useAuthStore()
  const [showMpinForm, setShowMpinForm] = useState(false)
  const [mpinForm, setMpinForm] = useState({ currentMpin: '', newMpin: '', confirmMpin: '' })
  const [mpinLoading, setMpinLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => { if (!token) router.replace('/login') }, [token, router])

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(user?.upiId || '')
    setCopied(true)
    toast.success('UPI ID copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleChangeMpin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mpinForm.newMpin !== mpinForm.confirmMpin) {
      toast.error('New MPINs do not match'); return
    }
    if (!/^\d{6}$/.test(mpinForm.newMpin)) {
      toast.error('MPIN must be exactly 6 digits'); return
    }
    setMpinLoading(true)
    try {
      await api.patch('/users/change-mpin', {
        currentMpin: mpinForm.currentMpin,
        newMpin: mpinForm.newMpin,
      })
      toast.success('MPIN changed successfully!')
      setShowMpinForm(false)
      setMpinForm({ currentMpin: '', newMpin: '', confirmMpin: '' })
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to change MPIN')
    } finally {
      setMpinLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    toast.success('Logged out')
    router.push('/login')
  }

  if (!user) return null

  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto p-4 md:p-8 space-y-4 animate-fade-in">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Profile</h1>

        {/* Avatar + Name */}
        <div className="card p-6 flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-200">
            <span className="text-white text-xl font-bold">{initials}</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{user.name}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
            <p className="text-sm text-gray-500">+91 {user.phone}</p>
          </div>
        </div>

        {/* UPI ID + QR Code */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Your UPI ID & QR Code</h3>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* QR */}
            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex-shrink-0">
              <QRCodeSVG
                value={`upi://pay?pa=${user.upiId}&pn=${user.name}&cu=INR`}
                size={140}
                level="H"
                includeMargin={false}
                fgColor="#111827"
              />
              <p className="text-center text-xs text-gray-400 mt-2 font-medium">Scan to Pay</p>
            </div>

            {/* UPI ID copy */}
            <div className="flex-1 space-y-3 w-full">
              <div>
                <p className="text-xs text-gray-500 mb-1">UPI ID</p>
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                  <span className="text-sm font-mono text-gray-800 flex-1 truncate">{user.upiId}</span>
                  <button onClick={handleCopyUpiId} className="text-brand-600 hover:text-brand-700 transition-colors flex-shrink-0">
                    {copied ? (
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-brand-50 rounded-xl p-3">
                <p className="text-xs text-brand-700 font-medium">Available Balance</p>
                <p className="text-xl font-bold text-brand-800 mt-0.5">
                  ₹{user.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="card p-6 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Account Details</h3>
          {[
            { label: 'Full Name', value: user.name },
            { label: 'Phone', value: `+91 ${user.phone}` },
            { label: 'Email', value: user.email },
            { label: 'UPI ID', value: user.upiId },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm font-medium text-gray-800 font-mono text-right max-w-[60%] truncate">{value}</span>
            </div>
          ))}
        </div>

        {/* Change MPIN */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Change MPIN</h3>
              <p className="text-xs text-gray-400 mt-0.5">Update your 6-digit payment PIN</p>
            </div>
            <button
              onClick={() => setShowMpinForm(!showMpinForm)}
              className="text-sm text-brand-600 font-medium hover:underline">
              {showMpinForm ? 'Cancel' : 'Change'}
            </button>
          </div>

          {showMpinForm && (
            <form onSubmit={handleChangeMpin} className="space-y-3 animate-slide-up">
              {[
                { name: 'currentMpin', label: 'Current MPIN', placeholder: '••••••' },
                { name: 'newMpin', label: 'New MPIN', placeholder: '••••••' },
                { name: 'confirmMpin', label: 'Confirm New MPIN', placeholder: '••••••' },
              ].map(({ name, label, placeholder }) => (
                <div key={name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    type="password"
                    value={mpinForm[name as keyof typeof mpinForm]}
                    onChange={(e) => setMpinForm(p => ({ ...p, [name]: e.target.value }))}
                    className="input-field font-mono tracking-widest text-center"
                    placeholder={placeholder}
                    maxLength={6}
                    required
                  />
                </div>
              ))}
              <button type="submit" disabled={mpinLoading} className="btn-primary w-full">
                {mpinLoading ? 'Updating...' : 'Update MPIN'}
              </button>
            </form>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-3 px-6 rounded-xl border border-red-200 text-red-600 font-medium text-sm
            hover:bg-red-50 active:scale-95 transition-all flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>

        <p className="text-center text-xs text-gray-300 pb-4">PayFlow v1.0 · Built with Next.js & Node.js</p>
      </div>
    </AppLayout>
  )
}
