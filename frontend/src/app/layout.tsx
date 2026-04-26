'use client'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { useAuthStore } from '@/lib/store'
import { connectSocket, disconnectSocket } from '@/lib/socket'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()

  useEffect(() => {
    if (user?._id) {
      connectSocket(user._id)
    } else {
      disconnectSocket()
    }
  }, [user?._id])

  return (
    <html lang="en">
      <head>
        <title>PayFlow — UPI Payments</title>
        <meta name="description" content="Fast, secure UPI payments" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3500,
            style: {
              fontFamily: 'Sora, sans-serif',
              fontSize: '14px',
              borderRadius: '12px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            },
            success: { iconTheme: { primary: '#1a8456', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  )
}
