import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const MONGO_URL = process.env.MONGO_URL
const DB_NAME = process.env.DB_NAME || 'dcen_dkv'
const JWT_SECRET = process.env.JWT_SECRET || 'dcen-dkv-super-secret-2025'

let client = null
let dbInstance = null
async function getDb() {
  if (dbInstance) return dbInstance
  client = new MongoClient(MONGO_URL)
  await client.connect()
  dbInstance = client.db(DB_NAME)
  return dbInstance
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}
function json(data, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders() })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

async function authUser(request) {
  const h = request.headers.get('authorization') || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : null
  if (!token) return null
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const db = await getDb()
    const u = await db.collection('users').findOne({ id: payload.id }, { projection: { _id: 0, password: 0 } })
    return u
  } catch (e) {
    return null
  }
}

// ---- Static packages ----
const PACKAGES = [
  { id: 'basic', name: 'Basic Streaming', price: 3500000, cameras: 1, operators: 1,
    tagline: 'Cocok untuk acara sederhana', accent: 'blue',
    features: ['1 Kamera Full HD', '1 Operator', 'Streaming Full HD 1080p', '1 Platform', 'Durasi 4 jam'] },
  { id: 'professional', name: 'Professional', price: 8500000, cameras: 3, operators: 3,
    tagline: 'Paling populer untuk event resmi', accent: 'purple', popular: true,
    features: ['3 Kamera', 'Video Switcher', 'Audio Mixer', 'Grafis Live', 'Operator Lengkap', 'Multi Platform', 'Durasi 6 jam'] },
  { id: 'premium', name: 'Premium', price: 18000000, cameras: 6, operators: 6,
    tagline: 'Produksi kelas broadcast', accent: 'cyan',
    features: ['Multi Kamera (6+)', 'Drone Aerial', 'LED Screen', 'Recording 4K', 'Post Production', 'Full Crew', 'Durasi 8 jam'] },
]

function estimatePrice(b) {
  const pkg = PACKAGES.find((p) => p.id === b.packageId) || PACKAGES[0]
  const breakdown = []
  let total = pkg.price
  breakdown.push({ label: `Paket ${pkg.name}`, amount: pkg.price })
  const cameras = Number(b.cameras) || pkg.cameras
  const extraCam = Math.max(0, cameras - pkg.cameras)
  if (extraCam > 0) { const a = extraCam * 750000; total += a; breakdown.push({ label: `Tambahan ${extraCam} kamera`, amount: a }) }
  const ops = Number(b.operatorNeeded) || pkg.operators
  const extraOp = Math.max(0, ops - pkg.operators)
  if (extraOp > 0) { const a = extraOp * 500000; total += a; breakdown.push({ label: `Tambahan ${extraOp} operator`, amount: a }) }
  if (b.platform === 'Custom RTMP') { total += 500000; breakdown.push({ label: 'Custom RTMP setup', amount: 500000 }) }
  const dur = Number(b.durationHours) || 4
  if (dur > pkg_hours(pkg)) { const extraH = dur - pkg_hours(pkg); const a = extraH * 400000; total += a; breakdown.push({ label: `Tambahan ${extraH} jam`, amount: a }) }
  if (b.addDrone && pkg.id !== 'premium') { total += 2500000; breakdown.push({ label: 'Drone aerial', amount: 2500000 }) }
  if (b.addLed && pkg.id !== 'premium') { total += 3500000; breakdown.push({ label: 'LED Screen', amount: 3500000 }) }
  if (b.recording && pkg.id === 'basic') { total += 1000000; breakdown.push({ label: 'Recording', amount: 1000000 }) }
  return { total, breakdown, package: pkg }
}
function pkg_hours(pkg) { return pkg.id === 'basic' ? 4 : pkg.id === 'professional' ? 6 : 8 }

async function handler(request, context) {
  try {
    const db = await getDb()
    const params = await context.params
    const path = params?.path || []
    const route = '/' + path.join('/')
    const method = request.method
    let body = {}
    if (method === 'POST' || method === 'PUT') { try { body = await request.json() } catch (e) { body = {} } }
    const user = await authUser(request)
    const isAdmin = user && ['admin', 'owner'].includes(user.role)

    // ---------- ROOT ----------
    if (route === '/' || route === '') return json({ status: 'ok', service: 'DCEN DKV API' })

    // ---------- AUTH ----------
    if (route === '/auth/register' && method === 'POST') {
      const { name, email, phone, password, role } = body
      if (!name || !password || (!email && !phone)) return json({ error: 'Nama, password, dan email/nomor HP wajib diisi' }, 400)
      const exists = await db.collection('users').findOne({ $or: [{ email: email || '__none__' }, { phone: phone || '__none__' }] })
      if (exists) return json({ error: 'Email/nomor HP sudah terdaftar' }, 400)
      const hash = await bcrypt.hash(password, 8)
      const u = { id: uuidv4(), name, email: email || '', phone: phone || '', password: hash, role: role && ['customer','crew'].includes(role) ? role : 'customer', membership: 'regular', createdAt: new Date().toISOString() }
      await db.collection('users').insertOne(u)
      const token = jwt.sign({ id: u.id }, JWT_SECRET, { expiresIn: '30d' })
      const { password: _p, _id, ...safe } = u
      return json({ token, user: safe })
    }
    if (route === '/auth/login' && method === 'POST') {
      const { email, password } = body
      const u = await db.collection('users').findOne({ $or: [{ email: email || '__none__' }, { phone: email || '__none__' }] })
      if (!u) return json({ error: 'Akun tidak ditemukan' }, 400)
      const ok = await bcrypt.compare(password || '', u.password)
      if (!ok) return json({ error: 'Password salah' }, 400)
      const token = jwt.sign({ id: u.id }, JWT_SECRET, { expiresIn: '30d' })
      const { password: _p, _id, ...safe } = u
      return json({ token, user: safe })
    }
    if (route === '/auth/me' && method === 'GET') {
      if (!user) return json({ error: 'Unauthorized' }, 401)
      return json({ user })
    }

    // ---------- PACKAGES ----------
    if (route === '/packages' && method === 'GET') return json({ packages: PACKAGES })

    // ---------- PORTFOLIO ----------
    if (route === '/portfolio' && method === 'GET') {
      const items = await db.collection('portfolio').find({}, { projection: { _id: 0 } }).toArray()
      return json({ portfolio: items })
    }

    // ---------- TESTIMONIALS ----------
    if (route === '/testimonials' && method === 'GET') {
      const items = await db.collection('testimonials').find({}, { projection: { _id: 0 } }).toArray()
      return json({ testimonials: items })
    }

    // ---------- EQUIPMENT ----------
    if (route === '/equipment' && method === 'GET') {
      const items = await db.collection('equipment').find({}, { projection: { _id: 0 } }).toArray()
      return json({ equipment: items })
    }
    if (route === '/equipment' && method === 'POST') {
      if (!isAdmin) return json({ error: 'Forbidden' }, 403)
      const item = { id: uuidv4(), name: body.name || 'Alat', category: body.category || 'Lainnya', spec: body.spec || '', pricePerDay: Number(body.pricePerDay) || 0, stock: Number(body.stock) || 1, available: body.available !== false, image: body.image || '', createdAt: new Date().toISOString() }
      await db.collection('equipment').insertOne(item)
      const { _id, ...safe } = item
      return json({ equipment: safe })
    }
    if (route.startsWith('/equipment/') && method === 'PUT') {
      if (!isAdmin) return json({ error: 'Forbidden' }, 403)
      const id = path[1]
      const upd = { ...body }; delete upd._id; delete upd.id
      if (upd.pricePerDay !== undefined) upd.pricePerDay = Number(upd.pricePerDay)
      if (upd.stock !== undefined) upd.stock = Number(upd.stock)
      await db.collection('equipment').updateOne({ id }, { $set: upd })
      const item = await db.collection('equipment').findOne({ id }, { projection: { _id: 0 } })
      return json({ equipment: item })
    }
    if (route.startsWith('/equipment/') && method === 'DELETE') {
      if (!isAdmin) return json({ error: 'Forbidden' }, 403)
      await db.collection('equipment').deleteOne({ id: path[1] })
      return json({ success: true })
    }

    // ---------- BOOKINGS ----------
    if (route === '/bookings/estimate' && method === 'POST') {
      return json(estimatePrice(body))
    }
    if (route === '/bookings' && method === 'POST') {
      const est = estimatePrice(body)
      const bk = {
        id: uuidv4(), userId: user ? user.id : null,
        eventName: body.eventName || '', eventType: body.eventType || 'Lainnya',
        date: body.date || '', time: body.time || '', location: body.location || '',
        cameras: Number(body.cameras) || 1, operatorNeeded: Number(body.operatorNeeded) || 1,
        platform: body.platform || 'YouTube Live', packageId: body.packageId || 'basic',
        durationHours: Number(body.durationHours) || 4,
        addDrone: !!body.addDrone, addLed: !!body.addLed, recording: !!body.recording,
        brief: body.brief || '', contactName: body.contactName || (user ? user.name : ''),
        contactPhone: body.contactPhone || (user ? user.phone : ''),
        estimatedPrice: est.total, breakdown: est.breakdown,
        status: 'Menunggu', assignedCrew: [], invoice: null,
        createdAt: new Date().toISOString(),
      }
      await db.collection('bookings').insertOne(bk)
      const { _id, ...safe } = bk
      return json({ booking: safe })
    }
    if (route === '/bookings' && method === 'GET') {
      if (!user) return json({ error: 'Unauthorized' }, 401)
      const q = isAdmin ? {} : { userId: user.id }
      const items = await db.collection('bookings').find(q, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray()
      return json({ bookings: items })
    }
    if (route.startsWith('/bookings/') && method === 'PUT') {
      if (!isAdmin) return json({ error: 'Forbidden' }, 403)
      const id = path[1]
      const upd = {}
      if (body.status) upd.status = body.status
      if (body.assignedCrew) upd.assignedCrew = body.assignedCrew
      if (body.createInvoice) {
        upd.invoice = { number: 'INV-' + Date.now().toString().slice(-8), issuedAt: new Date().toISOString(), amount: body.amount || 0 }
      }
      await db.collection('bookings').updateOne({ id }, { $set: upd })
      const item = await db.collection('bookings').findOne({ id }, { projection: { _id: 0 } })
      return json({ booking: item })
    }

    // ---------- RENTALS ----------
    if (route === '/rentals' && method === 'POST') {
      const eq = await db.collection('equipment').findOne({ id: body.equipmentId })
      if (!eq) return json({ error: 'Alat tidak ditemukan' }, 404)
      const days = Number(body.days) || 1
      const rental = {
        id: uuidv4(), userId: user ? user.id : null, equipmentId: eq.id, equipmentName: eq.name,
        image: eq.image, startDate: body.startDate || '', days,
        pricePerDay: eq.pricePerDay, deposit: Math.round(eq.pricePerDay * 0.5),
        total: eq.pricePerDay * days,
        contactName: body.contactName || (user ? user.name : ''), contactPhone: body.contactPhone || (user ? user.phone : ''),
        status: 'Menunggu', createdAt: new Date().toISOString(),
      }
      await db.collection('rentals').insertOne(rental)
      const { _id, ...safe } = rental
      return json({ rental: safe })
    }
    if (route === '/rentals' && method === 'GET') {
      if (!user) return json({ error: 'Unauthorized' }, 401)
      const q = isAdmin ? {} : { userId: user.id }
      const items = await db.collection('rentals').find(q, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray()
      return json({ rentals: items })
    }
    if (route.startsWith('/rentals/') && method === 'PUT') {
      if (!isAdmin) return json({ error: 'Forbidden' }, 403)
      await db.collection('rentals').updateOne({ id: path[1] }, { $set: { status: body.status } })
      const item = await db.collection('rentals').findOne({ id: path[1] }, { projection: { _id: 0 } })
      return json({ rental: item })
    }

    // ---------- CREW ----------
    if (route === '/crew' && method === 'GET') {
      const items = await db.collection('crew').find({}, { projection: { _id: 0 } }).toArray()
      return json({ crew: items })
    }
    if (route === '/crew' && method === 'POST') {
      if (!isAdmin) return json({ error: 'Forbidden' }, 403)
      const c = { id: uuidv4(), name: body.name || 'Crew', position: body.position || 'Kameramen', phone: body.phone || '', status: body.status || 'Tersedia', createdAt: new Date().toISOString() }
      await db.collection('crew').insertOne(c)
      const { _id, ...safe } = c
      return json({ crew: safe })
    }
    if (route.startsWith('/crew/') && method === 'DELETE') {
      if (!isAdmin) return json({ error: 'Forbidden' }, 403)
      await db.collection('crew').deleteOne({ id: path[1] })
      return json({ success: true })
    }

    // ---------- STATS ----------
    if (route === '/stats' && method === 'GET') {
      if (!isAdmin) return json({ error: 'Forbidden' }, 403)
      const bookings = await db.collection('bookings').find({}, { projection: { _id: 0 } }).toArray()
      const rentals = await db.collection('rentals').find({}, { projection: { _id: 0 } }).toArray()
      const customers = await db.collection('users').countDocuments({ role: 'customer' })
      const equipment = await db.collection('equipment').find({}, { projection: { _id: 0 } }).toArray()
      const revenue = bookings.filter(b => ['Disetujui','Selesai','Berjalan'].includes(b.status)).reduce((s, b) => s + (b.estimatedPrice || 0), 0)
        + rentals.filter(r => ['Disetujui','Dipinjam','Selesai'].includes(r.status)).reduce((s, r) => s + (r.total || 0), 0)
      const running = bookings.filter(b => b.status === 'Berjalan').length
      const availableEquip = equipment.filter(e => e.available).length
      // monthly chart last 6 months
      const months = []
      const now = new Date()
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = d.toISOString().slice(0, 7)
        const label = d.toLocaleDateString('id-ID', { month: 'short' })
        const rev = bookings.filter(b => (b.createdAt || '').slice(0, 7) === key).reduce((s, b) => s + (b.estimatedPrice || 0), 0)
        const cnt = bookings.filter(b => (b.createdAt || '').slice(0, 7) === key).length
        months.push({ month: label, revenue: rev, bookings: cnt })
      }
      return json({
        stats: { customers, totalBookings: bookings.length, totalRentals: rentals.length, revenue, running, availableEquip, totalEquip: equipment.length },
        chart: months,
      })
    }

    // ---------- SEED ----------
    if (route === '/seed' && method === 'POST') {
      const count = await db.collection('equipment').countDocuments()
      if (count > 0 && !body.force) return json({ message: 'Sudah ada data', skipped: true })
      if (body.force) {
        await Promise.all(['equipment','portfolio','testimonials','crew'].map(c => db.collection(c).deleteMany({})))
      }
      const IMG = {
        control: 'https://images.unsplash.com/photo-1589186161289-9eb8898086df?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODh8MHwxfHNlYXJjaHwyfHxicm9hZGNhc3QlMjBzdHVkaW98ZW58MHx8fGJsYWNrfDE3OTAxNDUzMTB8MA&ixlib=rb-4.1.0&q=85',
        control2: 'https://images.unsplash.com/photo-1612544409025-e1f6a56c1152?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODh8MHwxfHNlYXJjaHw0fHxicm9hZGNhc3QlMjBzdHVkaW98ZW58MHx8fGJsYWNrfDE3OTAxNDUzMTB8MA&ixlib=rb-4.1.0&q=85',
        control3: 'https://images.unsplash.com/photo-1613031729579-ace1feefda4c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODh8MHwxfHNlYXJjaHwzfHxicm9hZGNhc3QlMjBzdHVkaW98ZW58MHx8fGJsYWNrfDE3OTAxNDUzMTB8MA&ixlib=rb-4.1.0&q=85',
        cam: 'https://images.unsplash.com/photo-1512025316832-8658f04f8a83?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHw0fHxwcm9mZXNzaW9uYWwlMjBjYW1lcmF8ZW58MHx8fGJsYWNrfDE3OTAxNDUzMTB8MA&ixlib=rb-4.1.0&q=85',
        equip2: 'https://images.pexels.com/photos/26736630/pexels-photo-26736630.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
        equip3: 'https://images.pexels.com/photos/13627258/pexels-photo-13627258.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
        concert: 'https://images.unsplash.com/photo-1558620013-a08999547a36?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODl8MHwxfHNlYXJjaHwzfHxjb25jZXJ0JTIwbGlnaHRpbmd8ZW58MHx8fGJsYWNrfDE3OTAxNDUzMTV8MA&ixlib=rb-4.1.0&q=85',
        concert2: 'https://images.unsplash.com/photo-1573339887617-d674bc961c31?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODl8MHwxfHNlYXJjaHwyfHxjb25jZXJ0JTIwbGlnaHRpbmd8ZW58MHx8fGJsYWNrfDE3OTAxNDUzMTV8MA&ixlib=rb-4.1.0&q=85',
        team: 'https://images.pexels.com/photos/30396798/pexels-photo-30396798.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
        team2: 'https://images.pexels.com/photos/7865064/pexels-photo-7865064.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      }
      const equipment = [
        { name: 'Sony PXW-Z280 4K', category: 'Kamera Profesional', spec: '3x 1/2" 4K sensor, 17x zoom optik', pricePerDay: 850000, stock: 4, image: IMG.cam },
        { name: 'PTZ Camera BirdDog P200', category: 'Kamera PTZ', spec: 'Full NDI, 20x zoom, remote control', pricePerDay: 650000, stock: 3, image: IMG.equip2 },
        { name: 'Blackmagic ATEM Mini Pro', category: 'Video Switcher', spec: '4 input HDMI, streaming direct', pricePerDay: 400000, stock: 5, image: IMG.control2 },
        { name: 'Elgato Cam Link 4K', category: 'Capture Card', spec: 'HDMI to USB 3.0, 4K30', pricePerDay: 150000, stock: 8, image: IMG.control3 },
        { name: 'Manfrotto Video Tripod', category: 'Tripod', spec: 'Fluid head, max 8kg', pricePerDay: 120000, stock: 10, image: IMG.equip3 },
        { name: 'Aputure 600D Pro', category: 'Lighting', spec: 'LED 600W, bi-color, bowens mount', pricePerDay: 500000, stock: 6, image: IMG.concert },
        { name: 'Rode Wireless GO II', category: 'Microphone', spec: 'Dual channel wireless, 200m range', pricePerDay: 200000, stock: 7, image: IMG.equip2 },
        { name: 'Yamaha MG16XU Mixer', category: 'Audio Mixer', spec: '16 channel, USB, efek built-in', pricePerDay: 350000, stock: 3, image: IMG.control },
        { name: 'JBL EON615 Speaker', category: 'Speaker', spec: '1000W, 15 inch, Bluetooth', pricePerDay: 300000, stock: 6, image: IMG.equip3 },
        { name: 'LED Screen P3 Indoor 3x2m', category: 'LED Screen', spec: 'Pixel pitch 3mm, panel modular', pricePerDay: 4500000, stock: 2, image: IMG.concert2 },
        { name: 'MacBook Pro M3 Max', category: 'Laptop Streaming', spec: 'M3 Max, 36GB RAM, streaming ready', pricePerDay: 550000, stock: 4, image: IMG.control2 },
        { name: 'Teradek VidiU Go Encoder', category: 'Encoder', spec: 'HEVC/H.264, bonding 4G/5G', pricePerDay: 600000, stock: 3, image: IMG.control3 },
      ].map((e) => ({ id: uuidv4(), available: true, createdAt: new Date().toISOString(), ...e }))
      await db.collection('equipment').insertMany(equipment)

      const portfolio = [
        { id: uuidv4(), title: 'Wedding Live Streaming - Bali', category: 'Pernikahan', image: IMG.team2, views: '12K' },
        { id: uuidv4(), title: 'Tech Summit Jakarta 2024', category: 'Seminar', image: IMG.control, views: '45K' },
        { id: uuidv4(), title: 'Music Concert Festival', category: 'Konser', image: IMG.concert, views: '128K' },
        { id: uuidv4(), title: 'Sunday Service Broadcast', category: 'Ibadah', image: IMG.control2, views: '8K' },
        { id: uuidv4(), title: 'Corporate Annual Meeting', category: 'Acara Perusahaan', image: IMG.team, views: '5K' },
        { id: uuidv4(), title: 'Global Webinar Series', category: 'Webinar', image: IMG.control3, views: '32K' },
        { id: uuidv4(), title: 'Live Concert Multi-Cam', category: 'Konser', image: IMG.concert2, views: '210K' },
        { id: uuidv4(), title: 'Community Gathering', category: 'Gathering', image: IMG.equip2, views: '3K' },
      ]
      await db.collection('portfolio').insertMany(portfolio)

      const testimonials = [
        { id: uuidv4(), name: 'Andini Pratama', role: 'Wedding Organizer', text: 'Kualitas streaming DCEN DKV luar biasa! Tamu online merasa hadir langsung. Multi-cam sangat profesional.', rating: 5 },
        { id: uuidv4(), name: 'PT Maju Bersama', role: 'Corporate Client', text: 'Annual meeting kami berjalan mulus di 3 platform sekaligus. Tim sangat responsif dan tepat waktu.', rating: 5 },
        { id: uuidv4(), name: 'GKI Bandung', role: 'Church Ministry', text: 'Setiap minggu ibadah kami disiarkan dengan kualitas broadcast. Jemaat online meningkat drastis.', rating: 5 },
        { id: uuidv4(), name: 'Rizky Ramadhan', role: 'Event Organizer', text: 'Rental alatnya lengkap dan terawat. Booking gampang, harga transparan. Recommended!', rating: 5 },
      ]
      await db.collection('testimonials').insertMany(testimonials)

      const crew = [
        { id: uuidv4(), name: 'Budi Santoso', position: 'Kameramen', phone: '081234567001', status: 'Tersedia', createdAt: new Date().toISOString() },
        { id: uuidv4(), name: 'Dewi Lestari', position: 'Streaming Operator', phone: '081234567002', status: 'Tersedia', createdAt: new Date().toISOString() },
        { id: uuidv4(), name: 'Agus Wijaya', position: 'Audio Engineer', phone: '081234567003', status: 'Bertugas', createdAt: new Date().toISOString() },
        { id: uuidv4(), name: 'Sinta Maharani', position: 'Editor', phone: '081234567004', status: 'Tersedia', createdAt: new Date().toISOString() },
        { id: uuidv4(), name: 'Eko Prasetyo', position: 'Technical Support', phone: '081234567005', status: 'Tersedia', createdAt: new Date().toISOString() },
      ]
      await db.collection('crew').insertMany(crew)

      // default users
      const adminExists = await db.collection('users').findOne({ email: 'admin@dcen.com' })
      if (!adminExists) {
        const hash = await bcrypt.hash('admin123', 8)
        await db.collection('users').insertOne({ id: uuidv4(), name: 'Admin DCEN', email: 'admin@dcen.com', phone: '', password: hash, role: 'owner', membership: 'owner', createdAt: new Date().toISOString() })
        const chash = await bcrypt.hash('customer123', 8)
        await db.collection('users').insertOne({ id: uuidv4(), name: 'Rizky Customer', email: 'customer@dcen.com', phone: '08111111111', password: chash, role: 'customer', membership: 'gold', createdAt: new Date().toISOString() })
      }
      return json({ success: true, equipment: equipment.length, portfolio: portfolio.length, testimonials: testimonials.length, crew: crew.length })
    }

    return json({ error: 'Not found', route, method }, 404)
  } catch (e) {
    console.error('API Error:', e)
    return json({ error: 'Server error', detail: String(e?.message || e) }, 500)
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const DELETE = handler
