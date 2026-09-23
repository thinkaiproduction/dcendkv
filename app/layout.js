import './globals.css'
import { Toaster } from 'sonner'

export const metadata = {
  title: 'DCEN DKV — Live Streaming & Rental Multimedia Profesional',
  description: 'DCEN DKV: Platform jasa live streaming multi-kamera, rental alat multimedia, dan produksi video profesional. Booking cepat, harga transparan, kualitas broadcast.',
  keywords: 'live streaming, rental kamera, multimedia, produksi video, streaming event, jakarta, indonesia',
  openGraph: {
    title: 'DCEN DKV — Live Streaming & Rental Multimedia',
    description: 'Jasa live streaming multi-kamera & rental alat multimedia profesional.',
    type: 'website',
  },
}

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#05050a' }

export default function RootLayout({ children }) {
  return (
    <html lang="id" className="dark">
      <body className="bg-[#05050a] text-slate-100 antialiased">
        {children}
        <Toaster theme="dark" position="top-center" richColors />
      </body>
    </html>
  )
}
