'use client'
import { useEffect, useRef, useState } from 'react'

interface QRScannerProps {
  onScan: (result: string) => void
  onClose: () => void
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const containerId = 'qr-scanner-container'

  useEffect(() => {
    let html5QrCode: any = null

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        html5QrCode = new Html5Qrcode(containerId)
        scannerRef.current = html5QrCode

        await html5QrCode.start(
          { facingMode: 'environment' }, // use back camera
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            // Parse UPI QR code format
            // Format: upi://pay?pa=upiid@payflow&pn=Name&cu=INR
            let upiId = decodedText
            if (decodedText.includes('upi://pay')) {
              const url = new URL(decodedText)
              upiId = url.searchParams.get('pa') || decodedText
            }
            onScan(upiId)
            html5QrCode.stop()
          },
          () => {} // ignore errors during scanning
        )
        setLoading(false)
      } catch (err: any) {
        setError('Camera access denied. Please allow camera permission and try again.')
        setLoading(false)
      }
    }

    startScanner()

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [onScan])

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Scan QR Code</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scanner area */}
        <div className="p-4">
          {loading && (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <svg className="animate-spin h-8 w-8 text-brand-500" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
              </svg>
              <p className="text-sm text-gray-500">Starting camera...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-sm text-red-600">{error}</p>
              <button onClick={onClose} className="btn-primary text-sm px-4 py-2">Close</button>
            </div>
          )}

          {/* QR Scanner container */}
          <div
            id={containerId}
            className={`rounded-xl overflow-hidden ${loading || error ? 'hidden' : 'block'}`}
            style={{ width: '100%' }}
          />

          {!loading && !error && (
            <p className="text-xs text-center text-gray-400 mt-3">
              Point camera at the PayFlow QR code
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
