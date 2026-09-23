'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Radio, Camera, Video, Sparkles, Menu, X, Phone, MessageCircle, Star,
  Calendar, MapPin, Users, MonitorPlay, Zap, ShieldCheck, ArrowRight,
  LayoutDashboard, Package, UserCog, LogOut, Plus, Trash2, CheckCircle2,
  Clock, TrendingUp, Wallet, Boxes, PlayCircle, ChevronRight, Loader2,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar,
} from 'recharts'

const WA_NUMBER = '6281234567890'
const fmt = (n) => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID')

// ---------- API helper ----------
const api = async (path, { method = 'GET', body, token } = {}) => {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = 'Bearer ' + token
  const res = await fetch('/api' + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan')
  return data
}

const toast = (msg, type = 'success') => {
  if (typeof window !== 'undefined' && window.__sonner) window.__sonner(msg, type)
}

// ================= MAIN APP =================
export default function App() {
  const [view, setView] = useState('home')
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [mobileNav, setMobileNav] = useState(false)
  const [packages, setPackages] = useState([])
  const [notice, setNotice] = useState(null)

  // sonner bridge
  useEffect(() => {
    import('sonner').then((m) => { window.__sonner = (msg, type) => (m.toast[type] ? m.toast[type](msg) : m.toast(msg)) })
  }, [])

  useEffect(() => {
    const t = localStorage.getItem('dcen_token')
    if (t) {
      setToken(t)
      api('/auth/me', { token: t }).then((d) => setUser(d.user)).catch(() => { localStorage.removeItem('dcen_token'); setToken(null) })
    }
    api('/packages').then((d) => setPackages(d.packages || [])).catch(() => {})
    // auto-seed on first load
    api('/seed', { method: 'POST', body: {} }).catch(() => {})
  }, [])

  const login = (tk, u) => {
    setToken(tk); setUser(u); localStorage.setItem('dcen_token', tk); setAuthOpen(false)
    toast(`Selamat datang, ${u.name}!`)
    if (['admin', 'owner'].includes(u.role)) setView('admin')
  }
  const logout = () => { setToken(null); setUser(null); localStorage.removeItem('dcen_token'); setView('home'); toast('Anda telah keluar') }

  const isAdmin = user && ['admin', 'owner'].includes(user.role)

  const nav = (v) => { setView(v); setMobileNav(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return (
    <div className="min-h-screen bg-[#05050a] text-slate-100 selection:bg-violet-500/40">
      <Navbar {...{ view, nav, user, isAdmin, setAuthOpen, setAuthMode, logout, mobileNav, setMobileNav }} />

      <main>
        {view === 'home' && <Home {...{ nav, packages, setAuthOpen, setAuthMode, user }} />}
        {view === 'booking' && <BookingPage {...{ packages, token, user, setAuthOpen, setAuthMode }} />}
        {view === 'catalog' && <CatalogPage {...{ token, user, setAuthOpen, setAuthMode }} />}
        {view === 'portfolio' && <PortfolioPage />}
        {view === 'orders' && <OrdersPage {...{ token, user }} />}
        {view === 'admin' && isAdmin && <AdminPage {...{ token }} />}
      </main>

      <Footer nav={nav} />
      <WhatsAppFloat />

      <AnimatePresence>
        {authOpen && (
          <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setAuthOpen(false)} onLogin={login} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ================= NAVBAR =================
function Navbar({ view, nav, user, isAdmin, setAuthOpen, setAuthMode, logout, mobileNav, setMobileNav }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', h); return () => window.removeEventListener('scroll', h)
  }, [])
  const links = [
    { k: 'home', label: 'Beranda' },
    { k: 'booking', label: 'Booking' },
    { k: 'catalog', label: 'Rental Alat' },
    { k: 'portfolio', label: 'Portofolio' },
  ]
  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#05050a]/85 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button onClick={() => nav('home')} className="flex items-center gap-2 group">
          <div className="relative">
            <img src="/logo-dkv.webp" alt="DCEN DKV" className="w-10 h-10 object-contain" />
          </div>
          <div className="leading-none">
            <span className="font-black tracking-tight text-lg bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">DCEN</span>
            <span className="font-black tracking-tight text-lg text-violet-400"> DKV</span>
          </div>
        </button>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <button key={l.k} onClick={() => nav(l.k)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === l.k ? 'text-white bg-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              {l.label}
            </button>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button onClick={() => nav('admin')} className="px-3 py-2 rounded-lg text-sm font-medium text-violet-300 hover:bg-violet-500/10 flex items-center gap-1.5">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </button>
              )}
              {!isAdmin && (
                <button onClick={() => nav('orders')} className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/5">Pesanan Saya</button>
              )}
              <div className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full bg-white/5 border border-white/10">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold">{user.name?.[0]?.toUpperCase()}</div>
                <span className="text-sm text-slate-300 max-w-[80px] truncate">{user.name}</span>
                <button onClick={logout} className="p-1.5 rounded-full hover:bg-white/10 text-slate-400"><LogOut className="w-4 h-4" /></button>
              </div>
            </div>
          ) : (
            <>
              <button onClick={() => { setAuthMode('login'); setAuthOpen(true) }} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white">Masuk</button>
              <button onClick={() => { setAuthMode('register'); setAuthOpen(true) }} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-400 hover:to-violet-500 shadow-lg shadow-violet-500/25 transition-all">Daftar</button>
            </>
          )}
        </div>

        <button className="md:hidden p-2 text-slate-300" onClick={() => setMobileNav(!mobileNav)}>
          {mobileNav ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileNav && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden bg-[#0a0a12] border-b border-white/5">
            <div className="px-4 py-3 flex flex-col gap-1">
              {links.map((l) => (
                <button key={l.k} onClick={() => nav(l.k)} className="text-left px-4 py-3 rounded-lg text-slate-300 hover:bg-white/5">{l.label}</button>
              ))}
              {user ? (
                <>
                  {isAdmin ? <button onClick={() => nav('admin')} className="text-left px-4 py-3 rounded-lg text-violet-300 hover:bg-white/5">Dashboard Admin</button>
                    : <button onClick={() => nav('orders')} className="text-left px-4 py-3 rounded-lg text-slate-300 hover:bg-white/5">Pesanan Saya</button>}
                  <button onClick={logout} className="text-left px-4 py-3 rounded-lg text-red-400 hover:bg-white/5">Keluar ({user.name})</button>
                </>
              ) : (
                <div className="flex gap-2 pt-2">
                  <button onClick={() => { setAuthMode('login'); setMobileNav(false); setAuthOpen(true) }} className="flex-1 px-4 py-3 rounded-lg bg-white/5 text-slate-200">Masuk</button>
                  <button onClick={() => { setAuthMode('register'); setMobileNav(false); setAuthOpen(true) }} className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-violet-600 font-semibold">Daftar</button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

// ================= HOME =================
const HERO = 'https://images.unsplash.com/photo-1589186161289-9eb8898086df?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODh8MHwxfHNlYXJjaHwyfHxicm9hZGNhc3QlMjBzdHVkaW98ZW58MHx8fGJsYWNrfDE3OTAxNDUzMTB8MA&ixlib=rb-4.1.0&q=85'

function Home({ nav, packages, user }) {
  const [portfolio, setPortfolio] = useState([])
  const [testimonials, setTestimonials] = useState([])
  useEffect(() => {
    api('/portfolio').then((d) => setPortfolio(d.portfolio || [])).catch(() => {})
    api('/testimonials').then((d) => setTestimonials(d.testimonials || [])).catch(() => {})
  }, [])

  const services = [
    { icon: MonitorPlay, title: 'Live Streaming Multi-Cam', desc: 'Siaran langsung profesional multi kamera ke YouTube, Facebook, Instagram, Zoom & Custom RTMP.' },
    { icon: Camera, title: 'Rental Alat Multimedia', desc: 'Sewa kamera, switcher, lighting, audio mixer, LED screen & alat broadcast lengkap.' },
    { icon: Video, title: 'Produksi & Recording', desc: 'Recording kualitas 4K, multi-track audio, dan post-production untuk hasil terbaik.' },
    { icon: Zap, title: 'Streaming Event', desc: 'Pernikahan, seminar, konser, ibadah, webinar, hingga acara korporat berskala besar.' },
  ]
  const partners = ['YouTube', 'Facebook', 'Zoom', 'Instagram', 'Vimeo', 'Twitch']

  return (
    <div>
      {/* HERO */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO} alt="broadcast control room" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#05050a] via-[#05050a]/80 to-violet-950/40" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(139,92,246,0.25),transparent_50%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05050a] via-transparent to-[#05050a]/60" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16 w-full">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-slate-300 mb-6 backdrop-blur">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> LIVE Production Studio — Sejak 2020
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight">
              Siarkan Momen<br />
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Terbaik Anda</span><br />
              Secara Langsung
            </h1>
            <p className="mt-6 text-lg text-slate-400 max-w-xl leading-relaxed">
              DCEN DKV menghadirkan jasa live streaming multi-kamera & rental alat multimedia kualitas broadcast untuk setiap event Anda.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button onClick={() => nav('booking')} className="group px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-400 hover:to-violet-500 font-semibold shadow-xl shadow-violet-500/30 flex items-center justify-center gap-2 transition-all">
                Booking Sekarang <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => nav('catalog')} className="px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-semibold flex items-center justify-center gap-2 backdrop-blur transition-all">
                <Package className="w-4 h-4" /> Lihat Katalog Alat
              </button>
            </div>
            <div className="mt-12 grid grid-cols-3 gap-6 max-w-lg">
              {[['500+', 'Event Sukses'], ['50+', 'Alat Broadcast'], ['4.9★', 'Rating Klien']].map(([n, l]) => (
                <div key={l}>
                  <div className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">{n}</div>
                  <div className="text-sm text-slate-500">{l}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* SERVICES */}
      <Section id="services" eyebrow="Layanan Kami" title="Solusi Produksi End-to-End" desc="Dari perencanaan hingga siaran langsung, kami menangani semua kebutuhan multimedia Anda.">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {services.map((s, i) => (
            <motion.div key={s.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="group p-6 rounded-2xl bg-gradient-to-b from-white/5 to-transparent border border-white/10 hover:border-violet-500/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-violet-500/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <s.icon className="w-6 h-6 text-violet-300" />
              </div>
              <h3 className="font-bold text-lg mb-2">{s.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* PACKAGES */}
      <Section id="packages" eyebrow="Paket Layanan" title="Pilih Paket Sesuai Kebutuhan" desc="Harga transparan, kualitas broadcast. Semua paket bisa dikustomisasi.">
        <div className="grid md:grid-cols-3 gap-6">
          {packages.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className={`relative p-7 rounded-3xl border transition-all ${p.popular ? 'bg-gradient-to-b from-violet-600/20 to-transparent border-violet-500/50 shadow-2xl shadow-violet-500/20 scale-[1.02]' : 'bg-white/[0.03] border-white/10 hover:border-white/20'}`}>
              {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-500 to-violet-600 text-xs font-bold">TERPOPULER</span>}
              <h3 className="text-xl font-bold">{p.name}</h3>
              <p className="text-sm text-slate-400 mt-1">{p.tagline}</p>
              <div className="mt-4 mb-6">
                <span className="text-3xl font-black">{fmt(p.price)}</span>
                <span className="text-slate-500 text-sm"> / event</span>
              </div>
              <ul className="space-y-3 mb-6">
                {p.features?.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <CheckCircle2 className="w-4.5 h-4.5 text-violet-400 shrink-0 mt-0.5" style={{ width: 18, height: 18 }} /> {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => nav('booking')} className={`w-full py-3 rounded-xl font-semibold transition-all ${p.popular ? 'bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-400 hover:to-violet-500 shadow-lg shadow-violet-500/30' : 'bg-white/5 hover:bg-white/10 border border-white/10'}`}>
                Pilih {p.name}
              </button>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* PORTFOLIO */}
      <Section id="gallery" eyebrow="Portofolio" title="Hasil Produksi Kami" desc="Ratusan event telah kami siarkan dengan kualitas terbaik.">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {portfolio.slice(0, 8).map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="group relative aspect-[4/5] rounded-2xl overflow-hidden border border-white/10">
              <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <PlayCircle className="w-12 h-12 text-white/90" />
              </div>
              <div className="absolute bottom-0 p-4">
                <span className="inline-block px-2 py-0.5 rounded-md bg-violet-500/30 backdrop-blur text-xs text-violet-200 mb-1.5">{p.category}</span>
                <h4 className="font-semibold text-sm leading-tight">{p.title}</h4>
                <p className="text-xs text-slate-400 mt-1">{p.views} views</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* TESTIMONIALS */}
      <Section id="testimonials" eyebrow="Testimoni" title="Dipercaya Klien" desc="">
        <div className="grid md:grid-cols-2 gap-5">
          {testimonials.map((t) => (
            <div key={t.id} className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="flex gap-1 mb-3">{Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
              <p className="text-slate-300 leading-relaxed">“{t.text}”</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center font-bold">{t.name[0]}</div>
                <div>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-xs text-slate-500">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* PARTNERS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <p className="text-center text-sm text-slate-500 mb-6">Streaming ke semua platform populer</p>
        <div className="flex flex-wrap justify-center gap-x-10 gap-y-4">
          {partners.map((p) => <span key={p} className="text-xl font-bold text-slate-600 hover:text-slate-300 transition-colors">{p}</span>)}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        <div className="relative rounded-3xl overflow-hidden p-10 sm:p-16 text-center bg-gradient-to-br from-blue-600/20 via-violet-600/20 to-fuchsia-600/20 border border-violet-500/30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.3),transparent_60%)]" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-black">Siap Menyiarkan Event Anda?</h2>
            <p className="mt-3 text-slate-300 max-w-xl mx-auto">Dapatkan estimasi harga instan dan konsultasi gratis dengan tim produksi kami.</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => nav('booking')} className="px-7 py-3.5 rounded-xl bg-white text-black font-bold hover:bg-slate-200 transition-all">Booking Live Streaming</button>
              <a href={`https://wa.me/${WA_NUMBER}?text=Halo%20DCEN%20DKV,%20saya%20ingin%20konsultasi`} target="_blank" rel="noreferrer" className="px-7 py-3.5 rounded-xl bg-green-600 hover:bg-green-500 font-bold flex items-center justify-center gap-2 transition-all">
                <MessageCircle className="w-5 h-5" /> Chat WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ id, eyebrow, title, desc, children }) {
  return (
    <section id={id} className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
      <div className="mb-10 text-center max-w-2xl mx-auto">
        <span className="text-sm font-semibold text-violet-400 uppercase tracking-wider">{eyebrow}</span>
        <h2 className="text-3xl sm:text-4xl font-black mt-2">{title}</h2>
        {desc && <p className="mt-3 text-slate-400">{desc}</p>}
      </div>
      {children}
    </section>
  )
}

// ================= AUTH MODAL =================
function AuthModal({ mode, setMode, onClose, onLogin }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const submit = async (e) => {
    e.preventDefault(); setLoading(true); setErr('')
    try {
      const data = mode === 'login'
        ? await api('/auth/login', { method: 'POST', body: { email: form.email, password: form.password } })
        : await api('/auth/register', { method: 'POST', body: form })
      onLogin(data.token, data.user)
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-md rounded-3xl bg-gradient-to-b from-[#12121c] to-[#0a0a12] border border-white/10 p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-black">{mode === 'login' ? 'Masuk' : 'Daftar Akun'}</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-slate-400"><X className="w-5 h-5" /></button>
        </div>
        {err && <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{err}</div>}
        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' && (
            <Field label="Nama Lengkap"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="John Doe" /></Field>
          )}
          <Field label={mode === 'login' ? 'Email / No. HP' : 'Email'}><input required type={mode === 'register' ? 'email' : 'text'} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="email@contoh.com" /></Field>
          {mode === 'register' && (
            <Field label="Nomor HP"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="0812xxxx" /></Field>
          )}
          <Field label="Password"><input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} placeholder="••••••" /></Field>
          <button disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-400 hover:to-violet-500 font-semibold shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2 disabled:opacity-60">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} {mode === 'login' ? 'Masuk' : 'Daftar Sekarang'}
          </button>
        </form>
        {mode === 'login' && (
          <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-400">
            <p className="font-semibold text-slate-300 mb-1">Demo login:</p>
            <p>Admin: admin@dcen.com / admin123</p>
            <p>Customer: customer@dcen.com / customer123</p>
          </div>
        )}
        <p className="mt-5 text-center text-sm text-slate-400">
          {mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-violet-400 font-semibold hover:underline">
            {mode === 'login' ? 'Daftar' : 'Masuk'}
          </button>
        </p>
      </motion.div>
    </motion.div>
  )
}

const inputCls = 'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 outline-none text-slate-100 placeholder:text-slate-600 transition-all'
function Field({ label, children }) {
  return (<label className="block"><span className="block text-sm font-medium text-slate-300 mb-1.5">{label}</span>{children}</label>)
}

// ================= BOOKING PAGE =================
function BookingPage({ packages, token, user, setAuthOpen, setAuthMode }) {
  const [form, setForm] = useState({
    eventName: '', eventType: 'Pernikahan', date: '', time: '', location: '',
    cameras: 3, operatorNeeded: 3, platform: 'YouTube Live', packageId: 'professional',
    durationHours: 6, addDrone: false, addLed: false, recording: false, brief: '',
    contactName: '', contactPhone: '',
  })
  const [est, setEst] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(null)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    const t = setTimeout(() => { api('/bookings/estimate', { method: 'POST', body: form }).then(setEst).catch(() => {}) }, 250)
    return () => clearTimeout(t)
  }, [form.packageId, form.cameras, form.operatorNeeded, form.platform, form.durationHours, form.addDrone, form.addLed, form.recording])

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const body = { ...form, contactName: form.contactName || user?.name, contactPhone: form.contactPhone || user?.phone }
      const d = await api('/bookings', { method: 'POST', body, token })
      setDone(d.booking); toast('Booking berhasil dikirim!')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) { toast(e.message, 'error') } finally { setSubmitting(false) }
  }

  if (done) return (
    <div className="max-w-2xl mx-auto px-4 pt-28 pb-20">
      <div className="rounded-3xl bg-gradient-to-b from-green-500/10 to-transparent border border-green-500/30 p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-5"><CheckCircle2 className="w-9 h-9 text-green-400" /></div>
        <h2 className="text-2xl font-black">Booking Terkirim!</h2>
        <p className="text-slate-400 mt-2">Pesanan <b>{done.eventName}</b> telah kami terima. Tim kami akan menghubungi Anda segera.</p>
        <div className="mt-6 p-5 rounded-2xl bg-white/[0.03] border border-white/10 text-left space-y-2">
          <Row label="ID Booking" value={done.id.slice(0, 8).toUpperCase()} />
          <Row label="Estimasi Harga" value={fmt(done.estimatedPrice)} highlight />
          <Row label="Status" value={done.status} />
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <a href={`https://wa.me/${WA_NUMBER}?text=Halo%20DCEN%20DKV,%20saya%20baru%20booking%20event%20${encodeURIComponent(done.eventName)}%20(ID:%20${done.id.slice(0,8).toUpperCase()})`} target="_blank" rel="noreferrer" className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 font-semibold flex items-center justify-center gap-2"><MessageCircle className="w-4 h-4" /> Konfirmasi via WhatsApp</a>
          <button onClick={() => setDone(null)} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 font-semibold">Booking Lagi</button>
        </div>
      </div>
    </div>
  )

  const eventTypes = ['Pernikahan', 'Seminar', 'Webinar', 'Konser', 'Ibadah', 'Gathering', 'Acara Perusahaan', 'Lainnya']
  const platforms = ['YouTube Live', 'Facebook Live', 'Instagram Live', 'Zoom', 'Custom RTMP']

  return (
    <div className="pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <span className="text-sm font-semibold text-violet-400 uppercase tracking-wider">Booking Live Streaming</span>
          <h1 className="text-3xl sm:text-4xl font-black mt-2">Pesan Jasa Siaran Langsung</h1>
          <p className="text-slate-400 mt-2">Isi detail event, estimasi harga dihitung otomatis secara real-time.</p>
        </div>

        <form onSubmit={submit} className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card title="Detail Event" icon={Calendar}>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Nama Event"><input required value={form.eventName} onChange={(e) => set('eventName', e.target.value)} className={inputCls} placeholder="Wedding Andi & Sinta" /></Field>
                <Field label="Jenis Acara">
                  <select value={form.eventType} onChange={(e) => set('eventType', e.target.value)} className={inputCls}>
                    {eventTypes.map((t) => <option key={t} className="bg-[#12121c]">{t}</option>)}
                  </select>
                </Field>
                <Field label="Tanggal"><input required type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={inputCls} /></Field>
                <Field label="Jam Mulai"><input required type="time" value={form.time} onChange={(e) => set('time', e.target.value)} className={inputCls} /></Field>
                <div className="sm:col-span-2"><Field label="Lokasi Event"><input required value={form.location} onChange={(e) => set('location', e.target.value)} className={inputCls} placeholder="Grand Ballroom Hotel, Jakarta" /></Field></div>
              </div>
            </Card>

            <Card title="Konfigurasi Produksi" icon={Camera}>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Paket Layanan">
                  <select value={form.packageId} onChange={(e) => set('packageId', e.target.value)} className={inputCls}>
                    {packages.map((p) => <option key={p.id} value={p.id} className="bg-[#12121c]">{p.name} — {fmt(p.price)}</option>)}
                  </select>
                </Field>
                <Field label="Platform Streaming">
                  <select value={form.platform} onChange={(e) => set('platform', e.target.value)} className={inputCls}>
                    {platforms.map((p) => <option key={p} className="bg-[#12121c]">{p}</option>)}
                  </select>
                </Field>
                <Field label={`Jumlah Kamera: ${form.cameras}`}>
                  <input type="range" min="1" max="10" value={form.cameras} onChange={(e) => set('cameras', Number(e.target.value))} className="w-full accent-violet-500" />
                </Field>
                <Field label={`Kebutuhan Operator: ${form.operatorNeeded}`}>
                  <input type="range" min="1" max="10" value={form.operatorNeeded} onChange={(e) => set('operatorNeeded', Number(e.target.value))} className="w-full accent-violet-500" />
                </Field>
                <Field label={`Durasi (jam): ${form.durationHours}`}>
                  <input type="range" min="2" max="12" value={form.durationHours} onChange={(e) => set('durationHours', Number(e.target.value))} className="w-full accent-violet-500" />
                </Field>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {[['addDrone', 'Drone Aerial'], ['addLed', 'LED Screen'], ['recording', 'Recording 4K']].map(([k, l]) => (
                  <button type="button" key={k} onClick={() => set(k, !form[k])}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${form[k] ? 'bg-violet-500/20 border-violet-500/50 text-violet-200' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                    {form[k] ? '✓ ' : '+ '}{l}
                  </button>
                ))}
              </div>
            </Card>

            <Card title="Informasi Kontak & Brief" icon={Users}>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Nama Kontak"><input value={form.contactName} onChange={(e) => set('contactName', e.target.value)} className={inputCls} placeholder={user?.name || 'Nama Anda'} /></Field>
                <Field label="No. HP / WhatsApp"><input value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} className={inputCls} placeholder={user?.phone || '0812xxxx'} /></Field>
                <div className="sm:col-span-2"><Field label="Brief Acara (opsional)"><textarea value={form.brief} onChange={(e) => set('brief', e.target.value)} rows={3} className={inputCls} placeholder="Ceritakan detail acara, rundown, atau kebutuhan khusus..." /></Field></div>
              </div>
            </Card>
          </div>

          {/* PRICE SUMMARY */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-3xl bg-gradient-to-b from-violet-600/15 to-transparent border border-violet-500/30 p-6">
              <div className="flex items-center gap-2 mb-4"><Wallet className="w-5 h-5 text-violet-400" /><h3 className="font-bold text-lg">Estimasi Harga</h3></div>
              <div className="space-y-2.5 mb-5">
                {est?.breakdown?.map((b, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-400">{b.label}</span>
                    <span className="text-slate-200 font-medium">{fmt(b.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-white/10 flex items-end justify-between">
                <span className="text-slate-400">Total Estimasi</span>
                <span className="text-2xl font-black bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">{fmt(est?.total || 0)}</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">*Harga final dikonfirmasi oleh tim setelah review.</p>
              {!user ? (
                <div className="mt-5">
                  <button type="submit" disabled={submitting} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-400 hover:to-violet-500 font-semibold shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2 disabled:opacity-60">
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Kirim Booking
                  </button>
                  <p className="text-xs text-center text-slate-500 mt-2">atau <button type="button" onClick={() => { setAuthMode('login'); setAuthOpen(true) }} className="text-violet-400">masuk</button> untuk melacak pesanan</p>
                </div>
              ) : (
                <button type="submit" disabled={submitting} className="mt-5 w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-400 hover:to-violet-500 font-semibold shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2 disabled:opacity-60">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Kirim Booking
                </button>
              )}
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="w-4 h-4 text-green-400" /> Tanpa pembayaran di muka</div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function Card({ title, icon: Icon, children }) {
  return (
    <div className="rounded-3xl bg-white/[0.03] border border-white/10 p-6">
      <div className="flex items-center gap-2 mb-5"><Icon className="w-5 h-5 text-violet-400" /><h3 className="font-bold text-lg">{title}</h3></div>
      {children}
    </div>
  )
}
function Row({ label, value, highlight }) {
  return (<div className="flex justify-between text-sm"><span className="text-slate-400">{label}</span><span className={highlight ? 'font-black text-violet-300' : 'font-medium text-slate-200'}>{value}</span></div>)
}

// ================= CATALOG PAGE =================
function CatalogPage({ token, user, setAuthOpen, setAuthMode }) {
  const [equipment, setEquipment] = useState([])
  const [cat, setCat] = useState('Semua')
  const [rentItem, setRentItem] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { api('/equipment').then((d) => { setEquipment(d.equipment || []); setLoading(false) }).catch(() => setLoading(false)) }, [])
  const cats = ['Semua', ...Array.from(new Set(equipment.map((e) => e.category)))]
  const filtered = cat === 'Semua' ? equipment : equipment.filter((e) => e.category === cat)

  return (
    <div className="pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <span className="text-sm font-semibold text-violet-400 uppercase tracking-wider">Marketplace Alat</span>
          <h1 className="text-3xl sm:text-4xl font-black mt-2">Rental Alat Multimedia</h1>
          <p className="text-slate-400 mt-2">Sewa peralatan broadcast profesional dengan harga terjangkau.</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${cat === c ? 'bg-gradient-to-r from-blue-500 to-violet-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'}`}>{c}</button>
          ))}
        </div>

        {loading ? <div className="text-center py-20 text-slate-500"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((e, i) => (
              <motion.div key={e.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i % 8) * 0.05 }}
                className="group rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden hover:border-violet-500/40 transition-all">
                <div className="relative aspect-video overflow-hidden bg-black">
                  <img src={e.image} alt={e.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur ${e.available ? 'bg-green-500/30 text-green-200' : 'bg-red-500/30 text-red-200'}`}>{e.available ? 'Tersedia' : 'Disewa'}</span>
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs bg-black/60 backdrop-blur text-slate-200">{e.category}</span>
                </div>
                <div className="p-4">
                  <h3 className="font-bold leading-tight">{e.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 h-8">{e.spec}</p>
                  <div className="mt-3 flex items-end justify-between">
                    <div><span className="text-lg font-black text-violet-300">{fmt(e.pricePerDay)}</span><span className="text-xs text-slate-500">/hari</span></div>
                    <button disabled={!e.available} onClick={() => setRentItem(e)} className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-400 hover:to-violet-500 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">Sewa</button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {rentItem && <RentalModal item={rentItem} token={token} user={user} onClose={() => setRentItem(null)} needLogin={!user} openAuth={() => { setAuthMode('login'); setAuthOpen(true) }} />}
      </AnimatePresence>
    </div>
  )
}

function RentalModal({ item, token, user, onClose, needLogin, openAuth }) {
  const [days, setDays] = useState(1)
  const [startDate, setStartDate] = useState('')
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const total = item.pricePerDay * days
  const submit = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      await api('/rentals', { method: 'POST', body: { equipmentId: item.id, days, startDate, contactName: name, contactPhone: phone }, token })
      setDone(true); toast('Permintaan rental terkirim!')
    } catch (e) { toast(e.message, 'error') } finally { setLoading(false) }
  }
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} className="w-full max-w-md rounded-3xl bg-gradient-to-b from-[#12121c] to-[#0a0a12] border border-white/10 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="relative aspect-video"><img src={item.image} alt={item.name} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#12121c] to-transparent" /><button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-lg bg-black/50 backdrop-blur"><X className="w-5 h-5" /></button></div>
        <div className="p-6">
          {done ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto mb-3" />
              <h3 className="text-xl font-black">Permintaan Terkirim!</h3>
              <p className="text-slate-400 text-sm mt-2">Rental <b>{item.name}</b> menunggu persetujuan admin.</p>
              <button onClick={onClose} className="mt-5 w-full py-3 rounded-xl bg-white/5 border border-white/10 font-semibold">Tutup</button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <h3 className="text-xl font-black">{item.name}</h3>
              <p className="text-sm text-slate-400 mt-1">{item.spec}</p>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Field label="Tanggal Sewa"><input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} /></Field>
                <Field label="Durasi (hari)"><input required type="number" min="1" value={days} onChange={(e) => setDays(Number(e.target.value))} className={inputCls} /></Field>
                <Field label="Nama"><input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Nama Anda" /></Field>
                <Field label="No. HP"><input required value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="0812xxxx" /></Field>
              </div>
              <div className="mt-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                <Row label={`Sewa ${days} hari`} value={fmt(total)} />
                <Row label="Deposit (50%)" value={fmt(Math.round(item.pricePerDay * 0.5))} />
                <div className="pt-2 border-t border-white/10"><Row label="Total Bayar" value={fmt(total)} highlight /></div>
              </div>
              <button disabled={loading} className="mt-4 w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-400 hover:to-violet-500 font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />} Konfirmasi Rental
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ================= PORTFOLIO PAGE =================
function PortfolioPage() {
  const [portfolio, setPortfolio] = useState([])
  const [cat, setCat] = useState('Semua')
  useEffect(() => { api('/portfolio').then((d) => setPortfolio(d.portfolio || [])).catch(() => {}) }, [])
  const cats = ['Semua', ...Array.from(new Set(portfolio.map((p) => p.category)))]
  const filtered = cat === 'Semua' ? portfolio : portfolio.filter((p) => p.category === cat)
  return (
    <div className="pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <span className="text-sm font-semibold text-violet-400 uppercase tracking-wider">Portofolio</span>
          <h1 className="text-3xl sm:text-4xl font-black mt-2">Karya & Produksi Kami</h1>
        </div>
        <div className="flex flex-wrap gap-2 mb-8">
          {cats.map((c) => <button key={c} onClick={() => setCat(c)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${cat === c ? 'bg-gradient-to-r from-blue-500 to-violet-600' : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'}`}>{c}</button>)}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: (i % 6) * 0.05 }} className="group relative aspect-video rounded-2xl overflow-hidden border border-white/10">
              <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><PlayCircle className="w-14 h-14 text-white/90" /></div>
              <div className="absolute bottom-0 p-5">
                <span className="inline-block px-2 py-0.5 rounded-md bg-violet-500/30 backdrop-blur text-xs text-violet-200 mb-2">{p.category}</span>
                <h3 className="font-bold">{p.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{p.views} views</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ================= ORDERS (customer) =================
function OrdersPage({ token, user }) {
  const [bookings, setBookings] = useState([])
  const [rentals, setRentals] = useState([])
  const [tab, setTab] = useState('bookings')
  useEffect(() => {
    if (!token) return
    api('/bookings', { token }).then((d) => setBookings(d.bookings || [])).catch(() => {})
    api('/rentals', { token }).then((d) => setRentals(d.rentals || [])).catch(() => {})
  }, [token])
  return (
    <div className="pt-24 pb-20 max-w-5xl mx-auto px-4 sm:px-6">
      <h1 className="text-3xl font-black">Pesanan Saya</h1>
      <p className="text-slate-400 mt-1">Halo {user?.name}, berikut riwayat pesanan Anda.</p>
      <div className="flex gap-2 mt-6 mb-6">
        {[['bookings', 'Booking Streaming'], ['rentals', 'Rental Alat']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-full text-sm font-medium ${tab === k ? 'bg-gradient-to-r from-blue-500 to-violet-600' : 'bg-white/5 text-slate-400 border border-white/10'}`}>{l}</button>
        ))}
      </div>
      {tab === 'bookings' ? (
        <div className="space-y-3">
          {bookings.length === 0 && <Empty text="Belum ada booking streaming." />}
          {bookings.map((b) => (
            <div key={b.id} className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-bold">{b.eventName}</div>
                <div className="text-sm text-slate-400">{b.eventType} · {b.date} {b.time} · {b.location}</div>
                <div className="text-xs text-slate-500 mt-1">ID: {b.id.slice(0, 8).toUpperCase()}</div>
              </div>
              <div className="text-right">
                <div className="font-black text-violet-300">{fmt(b.estimatedPrice)}</div>
                <StatusBadge status={b.status} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {rentals.length === 0 && <Empty text="Belum ada rental alat." />}
          {rentals.map((r) => (
            <div key={r.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-4">
              <img src={r.image} alt="" className="w-16 h-16 rounded-xl object-cover" />
              <div className="flex-1">
                <div className="font-bold">{r.equipmentName}</div>
                <div className="text-sm text-slate-400">{r.days} hari · mulai {r.startDate || '-'}</div>
              </div>
              <div className="text-right"><div className="font-black text-violet-300">{fmt(r.total)}</div><StatusBadge status={r.status} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
function Empty({ text }) { return <div className="py-16 text-center text-slate-500 rounded-2xl border border-dashed border-white/10">{text}</div> }

function StatusBadge({ status }) {
  const map = {
    'Menunggu': 'bg-amber-500/20 text-amber-300', 'Disetujui': 'bg-blue-500/20 text-blue-300',
    'Berjalan': 'bg-violet-500/20 text-violet-300', 'Selesai': 'bg-green-500/20 text-green-300',
    'Ditolak': 'bg-red-500/20 text-red-300', 'Dipinjam': 'bg-violet-500/20 text-violet-300',
    'Dikembalikan': 'bg-blue-500/20 text-blue-300', 'Tersedia': 'bg-green-500/20 text-green-300',
    'Bertugas': 'bg-amber-500/20 text-amber-300',
  }
  return <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] || 'bg-slate-500/20 text-slate-300'}`}>{status}</span>
}

// ================= ADMIN DASHBOARD =================
function AdminPage({ token }) {
  const [tab, setTab] = useState('stats')
  const tabs = [
    { k: 'stats', label: 'Statistik', icon: LayoutDashboard },
    { k: 'bookings', label: 'Booking', icon: Radio },
    { k: 'rentals', label: 'Rental', icon: Package },
    { k: 'equipment', label: 'Alat', icon: Boxes },
    { k: 'crew', label: 'Crew', icon: UserCog },
  ]
  return (
    <div className="pt-24 pb-20 max-w-7xl mx-auto px-4 sm:px-6">
      <div className="mb-6">
        <span className="text-sm font-semibold text-violet-400 uppercase tracking-wider">Dashboard Admin</span>
        <h1 className="text-3xl font-black mt-1">Panel Manajemen DCEN DKV</h1>
      </div>
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {tabs.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-all ${tab === t.k ? 'bg-gradient-to-r from-blue-500 to-violet-600' : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'stats' && <AdminStats token={token} />}
      {tab === 'bookings' && <AdminBookings token={token} />}
      {tab === 'rentals' && <AdminRentals token={token} />}
      {tab === 'equipment' && <AdminEquipment token={token} />}
      {tab === 'crew' && <AdminCrew token={token} />}
    </div>
  )
}

function AdminStats({ token }) {
  const [data, setData] = useState(null)
  useEffect(() => { api('/stats', { token }).then(setData).catch(() => {}) }, [token])
  if (!data) return <div className="py-20 text-center text-slate-500"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
  const s = data.stats
  const cards = [
    { label: 'Total Pelanggan', value: s.customers, icon: Users, color: 'from-blue-500/20 text-blue-300' },
    { label: 'Total Booking', value: s.totalBookings, icon: Radio, color: 'from-violet-500/20 text-violet-300' },
    { label: 'Pendapatan', value: fmt(s.revenue), icon: Wallet, color: 'from-green-500/20 text-green-300', big: true },
    { label: 'Event Berjalan', value: s.running, icon: TrendingUp, color: 'from-fuchsia-500/20 text-fuchsia-300' },
    { label: 'Alat Tersedia', value: `${s.availableEquip}/${s.totalEquip}`, icon: Boxes, color: 'from-cyan-500/20 text-cyan-300' },
    { label: 'Total Rental', value: s.totalRentals, icon: Package, color: 'from-amber-500/20 text-amber-300' },
  ]
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center mb-3`}><c.icon className="w-5 h-5" /></div>
            <div className={`font-black ${c.big ? 'text-xl' : 'text-2xl'}`}>{c.value}</div>
            <div className="text-sm text-slate-500">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
          <h3 className="font-bold mb-4">Pendapatan 6 Bulan</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.chart}>
              <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.6} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} /><YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => v >= 1000000 ? (v / 1000000) + 'jt' : v} />
              <Tooltip contentStyle={{ background: '#12121c', border: '1px solid #ffffff20', borderRadius: 12 }} formatter={(v) => fmt(v)} />
              <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fill="url(#rev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
          <h3 className="font-bold mb-4">Jumlah Booking / Bulan</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} /><YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#12121c', border: '1px solid #ffffff20', borderRadius: 12 }} cursor={{ fill: '#ffffff08' }} />
              <Bar dataKey="bookings" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function AdminBookings({ token }) {
  const [bookings, setBookings] = useState([])
  const [crew, setCrew] = useState([])
  const load = useCallback(() => {
    api('/bookings', { token }).then((d) => setBookings(d.bookings || [])).catch(() => {})
    api('/crew').then((d) => setCrew(d.crew || [])).catch(() => {})
  }, [token])
  useEffect(() => { load() }, [load])
  const statuses = ['Menunggu', 'Disetujui', 'Berjalan', 'Selesai', 'Ditolak']
  const update = async (id, body) => { try { await api('/bookings/' + id, { method: 'PUT', body, token }); load(); toast('Booking diperbarui') } catch (e) { toast(e.message, 'error') } }
  return (
    <div className="space-y-3">
      {bookings.length === 0 && <Empty text="Belum ada booking masuk." />}
      {bookings.map((b) => (
        <div key={b.id} className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-2"><span className="font-bold">{b.eventName}</span><StatusBadge status={b.status} /></div>
              <div className="text-sm text-slate-400 mt-1">{b.eventType} · {b.date} {b.time}</div>
              <div className="text-sm text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3.5 h-3.5" /> {b.location}</div>
              <div className="text-sm text-slate-500 mt-1">{b.cameras} kamera · {b.operatorNeeded} operator · {b.platform} · {b.durationHours} jam</div>
              <div className="text-sm text-slate-500 mt-1">Kontak: {b.contactName} ({b.contactPhone})</div>
              {b.brief && <div className="text-sm text-slate-500 mt-1 italic">“{b.brief}”</div>}
            </div>
            <div className="text-right"><div className="font-black text-lg text-violet-300">{fmt(b.estimatedPrice)}</div><div className="text-xs text-slate-500">ID {b.id.slice(0, 8).toUpperCase()}</div></div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 pt-4 border-t border-white/10">
            <select value={b.status} onChange={(e) => update(b.id, { status: e.target.value })} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm">
              {statuses.map((s) => <option key={s} className="bg-[#12121c]">{s}</option>)}
            </select>
            <select onChange={(e) => { if (e.target.value) update(b.id, { assignedCrew: [...(b.assignedCrew || []), e.target.value] }) }} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm" value="">
              <option value="" className="bg-[#12121c]">+ Assign Crew</option>
              {crew.map((c) => <option key={c.id} value={c.name} className="bg-[#12121c]">{c.name} ({c.position})</option>)}
            </select>
            {(b.assignedCrew || []).length > 0 && <span className="text-xs text-slate-400">Crew: {b.assignedCrew.join(', ')}</span>}
            {!b.invoice && b.status !== 'Menunggu' && <button onClick={() => update(b.id, { createInvoice: true, amount: b.estimatedPrice })} className="px-3 py-2 rounded-lg bg-blue-500/20 text-blue-300 text-sm font-medium">Buat Invoice</button>}
            {b.invoice && <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {b.invoice.number}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function AdminRentals({ token }) {
  const [rentals, setRentals] = useState([])
  const load = useCallback(() => { api('/rentals', { token }).then((d) => setRentals(d.rentals || [])).catch(() => {}) }, [token])
  useEffect(() => { load() }, [load])
  const statuses = ['Menunggu', 'Disetujui', 'Dipinjam', 'Dikembalikan', 'Selesai']
  const update = async (id, status) => { try { await api('/rentals/' + id, { method: 'PUT', body: { status }, token }); load(); toast('Rental diperbarui') } catch (e) { toast(e.message, 'error') } }
  return (
    <div className="space-y-3">
      {rentals.length === 0 && <Empty text="Belum ada rental masuk." />}
      {rentals.map((r) => (
        <div key={r.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-wrap items-center gap-4">
          <img src={r.image} alt="" className="w-16 h-16 rounded-xl object-cover" />
          <div className="flex-1 min-w-[180px]">
            <div className="flex items-center gap-2"><span className="font-bold">{r.equipmentName}</span><StatusBadge status={r.status} /></div>
            <div className="text-sm text-slate-400">{r.days} hari · mulai {r.startDate || '-'} · {r.contactName} ({r.contactPhone})</div>
          </div>
          <div className="text-right"><div className="font-black text-violet-300">{fmt(r.total)}</div><div className="text-xs text-slate-500">deposit {fmt(r.deposit)}</div></div>
          <select value={r.status} onChange={(e) => update(r.id, e.target.value)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm">
            {statuses.map((s) => <option key={s} className="bg-[#12121c]">{s}</option>)}
          </select>
        </div>
      ))}
    </div>
  )
}

function AdminEquipment({ token }) {
  const [equipment, setEquipment] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'Kamera Profesional', spec: '', pricePerDay: '', stock: 1, image: '' })
  const load = useCallback(() => { api('/equipment').then((d) => setEquipment(d.equipment || [])).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])
  const add = async (e) => {
    e.preventDefault()
    try { await api('/equipment', { method: 'POST', body: form, token }); setShowForm(false); setForm({ name: '', category: 'Kamera Profesional', spec: '', pricePerDay: '', stock: 1, image: '' }); load(); toast('Alat ditambahkan') } catch (e) { toast(e.message, 'error') }
  }
  const del = async (id) => { try { await api('/equipment/' + id, { method: 'DELETE', token }); load(); toast('Alat dihapus') } catch (e) { toast(e.message, 'error') } }
  const toggle = async (it) => { try { await api('/equipment/' + it.id, { method: 'PUT', body: { available: !it.available }, token }); load() } catch (e) { toast(e.message, 'error') } }
  const cats = ['Kamera Profesional', 'Kamera PTZ', 'Video Switcher', 'Capture Card', 'Tripod', 'Lighting', 'Microphone', 'Audio Mixer', 'Speaker', 'LED Screen', 'Laptop Streaming', 'Encoder', 'Kabel & Aksesoris']
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">Manajemen Alat ({equipment.length})</h3>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 font-semibold text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Tambah Alat</button>
      </div>
      <AnimatePresence>
        {showForm && (
          <motion.form initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} onSubmit={add} className="overflow-hidden mb-5">
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 grid sm:grid-cols-2 gap-4">
              <Field label="Nama Alat"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} /></Field>
              <Field label="Kategori"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>{cats.map((c) => <option key={c} className="bg-[#12121c]">{c}</option>)}</select></Field>
              <div className="sm:col-span-2"><Field label="Spesifikasi"><input value={form.spec} onChange={(e) => setForm({ ...form, spec: e.target.value })} className={inputCls} /></Field></div>
              <Field label="Harga / hari"><input required type="number" value={form.pricePerDay} onChange={(e) => setForm({ ...form, pricePerDay: e.target.value })} className={inputCls} /></Field>
              <Field label="Stok"><input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className={inputCls} /></Field>
              <div className="sm:col-span-2"><Field label="URL Foto"><input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className={inputCls} placeholder="https://..." /></Field></div>
              <button className="sm:col-span-2 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 font-semibold">Simpan Alat</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {equipment.map((e) => (
          <div key={e.id} className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
            <div className="flex gap-3 p-3">
              <img src={e.image} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{e.name}</div>
                <div className="text-xs text-slate-500">{e.category}</div>
                <div className="text-sm font-bold text-violet-300 mt-1">{fmt(e.pricePerDay)}</div>
                <div className="text-xs text-slate-500">Stok: {e.stock}</div>
              </div>
            </div>
            <div className="flex border-t border-white/10">
              <button onClick={() => toggle(e)} className={`flex-1 py-2.5 text-xs font-medium ${e.available ? 'text-green-400' : 'text-red-400'}`}>{e.available ? 'Tersedia' : 'Disewa'}</button>
              <button onClick={() => del(e.id)} className="px-4 py-2.5 text-red-400 border-l border-white/10 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdminCrew({ token }) {
  const [crew, setCrew] = useState([])
  const [form, setForm] = useState({ name: '', position: 'Kameramen', phone: '', status: 'Tersedia' })
  const load = useCallback(() => { api('/crew').then((d) => setCrew(d.crew || [])).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])
  const add = async (e) => { e.preventDefault(); try { await api('/crew', { method: 'POST', body: form, token }); setForm({ name: '', position: 'Kameramen', phone: '', status: 'Tersedia' }); load(); toast('Crew ditambahkan') } catch (e) { toast(e.message, 'error') } }
  const del = async (id) => { try { await api('/crew/' + id, { method: 'DELETE', token }); load(); toast('Crew dihapus') } catch (e) { toast(e.message, 'error') } }
  const positions = ['Kameramen', 'Streaming Operator', 'Audio Engineer', 'Editor', 'Technical Support']
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <form onSubmit={add} className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 h-fit space-y-4">
        <h3 className="font-bold">Tambah Crew</h3>
        <Field label="Nama"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} /></Field>
        <Field label="Jabatan"><select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className={inputCls}>{positions.map((p) => <option key={p} className="bg-[#12121c]">{p}</option>)}</select></Field>
        <Field label="No. HP"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} /></Field>
        <Field label="Status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}><option className="bg-[#12121c]">Tersedia</option><option className="bg-[#12121c]">Bertugas</option></select></Field>
        <button className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 font-semibold flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Tambah</button>
      </form>
      <div className="lg:col-span-2 space-y-3">
        {crew.map((c) => (
          <div key={c.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center font-bold">{c.name[0]}</div>
            <div className="flex-1">
              <div className="font-bold">{c.name}</div>
              <div className="text-sm text-slate-400">{c.position} · {c.phone}</div>
            </div>
            <StatusBadge status={c.status} />
            <button onClick={() => del(c.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ================= FOOTER =================
function Footer({ nav }) {
  return (
    <footer className="border-t border-white/5 bg-[#08080f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src="/logo-dkv.webp" alt="DCEN DKV" className="w-9 h-9 object-contain" />
              <span className="font-black text-lg">DCEN <span className="text-violet-400">DKV</span></span>
            </div>
            <p className="text-sm text-slate-500">Platform jasa live streaming & rental alat multimedia profesional untuk setiap event Anda.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Layanan</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><button onClick={() => nav('booking')} className="hover:text-white">Live Streaming</button></li>
              <li><button onClick={() => nav('catalog')} className="hover:text-white">Rental Alat</button></li>
              <li><button onClick={() => nav('portfolio')} className="hover:text-white">Portofolio</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Kontak</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li className="flex items-center gap-2"><Phone className="w-4 h-4" /> +62 812-3456-7890</li>
              <li className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Jakarta, Indonesia</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Butuh Bantuan?</h4>
            <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 font-semibold text-sm"><MessageCircle className="w-4 h-4" /> Chat WhatsApp</a>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-white/5 text-center text-sm text-slate-600">© 2025 DCEN DKV. All rights reserved. Premium Multimedia Production Studio.</div>
      </div>
    </footer>
  )
}

function WhatsAppFloat() {
  return (
    <a href={`https://wa.me/${WA_NUMBER}?text=Halo%20DCEN%20DKV`} target="_blank" rel="noreferrer"
      className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center shadow-2xl shadow-green-500/40 transition-all hover:scale-110">
      <MessageCircle className="w-7 h-7 text-white" />
      <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-30" />
    </a>
  )
}
