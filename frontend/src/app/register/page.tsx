'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'

type Step = 'register' | 'otp'

export default function RegisterPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [step, setStep] = useState<Step>('register')
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(30)
  const [otp, setOtp] = useState('')
  const [form, setForm] = useState({ name: '', phone: '', email: '', mpin: '', confirmMpin: '' })
  const otpInputs = useRef<(HTMLInputElement | null)[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (step === 'otp') {
      setResendTimer(30)
      timerRef.current = setInterval(() => {
        setResendTimer((t) => { if (t <= 1) { clearInterval(timerRef.current!); return 0 } return t - 1 })
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [step])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.mpin !== form.confirmMpin) { toast.error('MPINs do not match'); return }
    if (!/^\d{6}$/.test(form.mpin)) { toast.error('MPIN must be exactly 6 digits'); return }
    if (!/^[6-9]\d{9}$/.test(form.phone)) { toast.error('Enter a valid 10-digit Indian mobile number'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', { name: form.name, phone: form.phone, email: form.email, mpin: form.mpin })
      toast.success(data.message)
      setStep('otp')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed')
    } finally { setLoading(false) }
  }

  const handleOtpInput = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const char = e.target.value.replace(/\D/g, '').slice(-1)
    if (!char) return
    const newOtp = (otp + char).slice(0, 6)
    setOtp(newOtp)
    if (i < 5) otpInputs.current[i + 1]?.focus()
  }

  const handleOtpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') { setOtp(otp.slice(0, -1)); if (i > 0) otpInputs.current[i - 1]?.focus() }
  }

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { toast.error('Enter the complete 6-digit OTP'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/verify-register', { name: form.name, phone: form.phone, email: form.email, mpin: form.mpin, otp })
      setAuth(data.user, data.token)
      toast.success(data.message)
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'OTP verification failed')
      setOtp(''); otpInputs.current[0]?.focus()
    } finally { setLoading(false) }
  }

  const handleResend = async () => {
    if (resendTimer > 0) return
    try {
      const { data } = await api.post('/auth/resend-otp', { email: form.email, purpose: 'register', name: form.name })
      toast.success(data.message); setOtp(''); setResendTimer(30)
      timerRef.current = setInterval(() => { setResendTimer((t) => { if (t <= 1) { clearInterval(timerRef.current!); return 0 } return t - 1 }) }, 1000)
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to resend OTP') }
  }

  const otpDigits = otp.padEnd(6, ' ')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center mb-4 shadow-lg shadow-brand-200">
            <span className="text-white font-bold text-2xl">P</span>
          </div>
          {step === 'register' ? (
            <><h1 className="text-2xl font-semibold text-gray-900">Create your account</h1>
            <p className="text-sm text-gray-500 mt-1">Join PayFlow and start sending money instantly</p></>
          ) : (
            <><h1 className="text-2xl font-semibold text-gray-900">Verify your email</h1>
            <p className="text-sm text-gray-500 mt-1">OTP sent to <span className="font-medium text-gray-700">{form.email}</span></p></>
          )}
        </div>

        {step === 'register' && (
          <div className="card p-6">
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Full Name</label>
                <input name="name" value={form.name} onChange={handleChange} className="input-field" placeholder="Enter your full name" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Mobile Number</label>
                <div className="flex gap-2">
                  <span className="input-field w-16 text-center text-gray-500 pointer-events-none">+91</span>
                  <input name="phone" value={form.phone} onChange={handleChange} className="input-field flex-1" placeholder="9876543210" maxLength={10} required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Email Address</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} className="input-field" placeholder="yourname@gmail.com" required />
                <p className="text-xs text-gray-400 mt-1">OTP will be sent to this email</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Set MPIN</label>
                  <input name="mpin" type="password" value={form.mpin} onChange={handleChange} className="input-field font-mono tracking-widest" placeholder="••••••" maxLength={6} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Confirm MPIN</label>
                  <input name="confirmMpin" type="password" value={form.confirmMpin} onChange={handleChange} className="input-field font-mono tracking-widest" placeholder="••••••" maxLength={6} required />
                </div>
              </div>
              <p className="text-xs text-gray-400">MPIN is a 6-digit number used to authorize payments</p>
              <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                {loading ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg>Sending OTP...</span> : 'Send OTP & Continue'}
              </button>
            </form>
          </div>
        )}

        {step === 'otp' && (
          <div className="card p-6 animate-slide-up">
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-brand-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">Check your inbox and enter the 6-digit OTP</p>
            </div>

            <div className="flex justify-center gap-2 my-6">
              {[...Array(6)].map((_, i) => (
                <input key={i} ref={(el) => { otpInputs.current[i] = el }}
                  type="text" inputMode="numeric" maxLength={1}
                  value={otpDigits[i] !== ' ' ? otpDigits[i] : ''}
                  onChange={(e) => handleOtpInput(i, e)}
                  onKeyDown={(e) => handleOtpKey(i, e)}
                  className="w-11 h-12 text-center text-xl font-bold border-2 rounded-xl focus:outline-none focus:border-brand-500 transition-colors bg-gray-50 focus:bg-white"
                  style={{ borderColor: otpDigits[i] && otpDigits[i] !== ' ' ? '#1a8456' : undefined }}
                />
              ))}
            </div>

            <button onClick={handleVerifyOtp} disabled={loading || otp.length !== 6} className="btn-primary w-full">
              {loading ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg>Verifying...</span> : 'Verify & Create Account'}
            </button>

            <div className="text-center mt-4">
              <p className="text-sm text-gray-500">Didn't receive OTP?{' '}
                <button onClick={handleResend} disabled={resendTimer > 0}
                  className={`font-medium ${resendTimer > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-brand-600 hover:underline'}`}>
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                </button>
              </p>
            </div>
            <button onClick={() => { setStep('register'); setOtp('') }}
              className="w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-3 transition-colors">
              ← Change details
            </button>
          </div>
        )}

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
