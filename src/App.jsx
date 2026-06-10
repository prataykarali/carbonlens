import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { Alignment, Fit, Layout, useRive } from '@rive-app/react-canvas'
import {
  ArrowRight,
  Barcode,
  BatteryCharging,
  Bike,
  Bus,
  Camera,
  Car,
  CheckCircle2,
  ChevronDown,
  Compass,
  Database,
  DollarSign,
  Factory,
  Fan,
  FileImage,
  Globe2,
  Headphones,
  History,
  Keyboard,
  Leaf,
  ListChecks,
  Loader2,
  LocateFixed,
  MapPinned,
  Music2,
  Newspaper,
  Pause,
  Plane,
  Play,
  RefreshCw,
  Route,
  ScanLine,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Target,
  Train,
  Utensils,
  Upload,
  Users,
  Zap,
} from 'lucide-react'
import { categoryColors, estimateItemImpact, parseQuantity, pickAnchor } from './data/carbon'
import { lookupBarcode, makeImpactFromItems, parseManualInput, parseReceiptImage, phraseComparison } from './services/aiClients'
import { fetchArticles, fetchFoodImage, recordUsageEvent } from './services/backendApi'
import { createImpactProof } from './services/impactProof'
import { validateReceiptFileMeta } from './services/inputSafety'
import { calculateRouteImpact, estimateRouteDistance, renderOpenRouteMap } from './services/maps'
import { buildReductionPlan } from './services/reductionPlan'

const storageKey = 'carbonlens-session-v2'
const analyticsKey = 'carbonlens-privacy-metrics-v1'
const scannerTabs = [
  { id: 'receipt', label: 'Receipt', icon: FileImage },
  { id: 'barcode', label: 'Barcode', icon: Barcode },
  { id: 'manual', label: 'Manual', icon: Keyboard },
]
const navItems = [
  { id: 'scan', label: 'Scan' },
  { id: 'tours', label: 'Tours' },
  { id: 'diet', label: 'Diet' },
  { id: 'pulse', label: 'Pulse' },
  { id: 'dashboard', label: 'Dashboard' },
]
const sectionGuideItems = [
  { id: 'scan', label: 'Scan studio', action: 'Upload receipts, scan barcodes, or type a choice.', hint: 'Start here when you want an instant CO2e estimate.', icon: ScanLine },
  { id: 'tours', label: 'Route planner', action: 'Compare car, transit, rail, and bike trips.', hint: 'Enter origin, destination, date, budget, and travel mode.', icon: Route },
  { id: 'diet', label: 'Food tracker', action: 'Log breakfast, lunch, dinner, and snacks.', hint: 'Build an individual food database and daily meal report.', icon: Utensils },
  { id: 'pulse', label: 'Sustainability pulse', action: 'Read current context beside your footprint.', hint: 'Use articles as supporting evidence for the suggested swap.', icon: Newspaper },
  { id: 'dashboard', label: 'Daily report', action: 'Review true daily totals and category levers.', hint: 'Set a carbon target and watch the moving average.', icon: Target },
  { id: 'mirror', label: 'Weekly mirror', action: 'Find the one swap that matters most.', hint: 'Compare your stored days against your personal best.', icon: RefreshCw },
]
const videoAssets = ['/assets/vid1.mp4', '/assets/vid2.mp4', '/assets/vid3.mp4', '/assets/vid4.mp4', '/assets/vid5.mp4']
const soundtrackSrc = '/assets/crown_of_black.mp3'
const iconMap = { BatteryCharging, Bus, Factory, Fan, MapPinned, Plane, Snowflake }
const routeModes = [
  { id: 'car', label: 'Car', icon: Car },
  { id: 'transit', label: 'Transit', icon: Bus },
  { id: 'rail', label: 'Rail', icon: Train },
  { id: 'bike', label: 'Bike', icon: Bike },
]
const riveFillLayout = new Layout({ fit: Fit.Fill, alignment: Alignment.Center })
const toxicRiveLayout = new Layout({ fit: Fit.Contain, alignment: Alignment.Center })
const costPerKm = { car: 18, transit: 2.8, rail: 1.9, bike: 0.4 }
const trafficProfiles = {
  normal: { label: 'Normal traffic', multiplier: 1, note: 'Balanced route, normal idle time.' },
  low: { label: 'Low congestion window', multiplier: 0.86, note: 'Start before peak hours to avoid idle emissions.' },
  free: { label: 'Free-traffic day', multiplier: 0.74, note: 'Best for holidays, Sundays, and car-free corridors.' },
}
const foodStopOptions = [
  { id: 'light', label: 'Light vegetarian', kg: 0.42, cost: 120, examples: 'idli, fruit, lemon water' },
  { id: 'protein', label: 'Low-carbon protein', kg: 0.78, cost: 180, examples: 'chana bowl, dal, curd' },
  { id: 'street', label: 'Street snack', kg: 0.62, cost: 90, examples: 'samosa, puffed rice, tea' },
]
const defaultDietPlan = {
  breakfast: '',
  lunch: '',
  dinner: '',
  snack: '',
  servings: 1,
  preference: '',
}

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const riveShowcaseItems = [
  {
    src: '/assets/_fly.riv',
    label: 'Light Flow',
    tone: 'fly',
    icon: Leaf,
    title: 'Food swaps that stay gentle',
    description: 'Use it when a meal can get lighter without becoming joyless.',
  },
  {
    src: '/assets/rocket.riv',
    label: 'Momentum',
    tone: 'rocket',
    icon: Zap,
    title: 'Routes with cleaner velocity',
    description: 'The travel side of CarbonLens should feel fast, precise, and directional.',
  },
  {
    src: '/assets/toxic.riv',
    label: 'High Impact',
    tone: 'toxic',
    icon: Factory,
    title: 'The spike you should notice',
    sceneTitle: 'See the creatures and animals around you',
    description: 'Move through the polluted scene and notice the strange life that appears when waste and smoke take over.',
    actionLabel: 'Inspect the spike',
    actionTarget: 'dashboard',
  },
]

function AmbientRive({ src, label, icon: Icon, tone, compact = false }) {
  const { RiveComponent } = useRive(
    src
      ? {
          src,
          autoplay: true,
          automaticallyHandleEvents: true,
          layout: riveFillLayout,
        }
      : undefined,
  )

  return (
    <div className={`ambient-rive ambient-rive-${tone} ${compact ? 'is-compact' : ''}`}>
      <div aria-label={`${label} Rive animation`} className="ambient-rive-stage" role="img">
        {src ? <RiveComponent /> : null}
        <div className="ambient-rive-fallback"><Icon size={18} /></div>
      </div>
      <span>{label}</span>
    </div>
  )
}

function ToxicRiveScene({ item }) {
  const { rive, RiveComponent } = useRive(
    item.src
      ? {
          src: item.src,
          autoplay: true,
          autoBind: true,
          automaticallyHandleEvents: true,
          enableMultiTouch: true,
          isTouchScrollEnabled: true,
          layout: toxicRiveLayout,
          shouldDisableRiveListeners: false,
        }
      : undefined,
  )

  useEffect(() => {
    if (!rive) return
    const names = rive.stateMachineNames || []
    if (names.length) {
      rive.reset({ stateMachines: names, autoplay: true, autoBind: true })
      requestAnimationFrame(() => {
        rive.resizeToCanvas()
        rive.setupRiveListeners?.({ isTouchScrollEnabled: true })
        rive.startRendering()
      })
    } else if (rive.animationNames?.length) {
      rive.play(rive.animationNames)
    }
  }, [rive])

  return (
    <div className="toxic-rive-native" aria-label="Interactive toxic Rive scene" role="img">
      <RiveComponent />
    </div>
  )
}

function readSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey))
    return {
      city: saved?.city || 'Kolkata',
      history: saved?.history?.length ? saved.history : [],
      foodLogs: Array.isArray(saved?.foodLogs) ? saved.foodLogs : [],
      returning: Boolean(saved?.returning),
    }
  } catch {
    return { city: 'Kolkata', history: [], foodLogs: [], returning: false }
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function formatKg(value) {
  if (!Number.isFinite(value)) return '0.00'
  return value.toFixed(value < 10 ? 2 : 1)
}

function formatDateKey(date = new Date()) {
  return new Date(date).toISOString().slice(0, 10)
}

function formatShortDate(dateKey) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function makeHistoryRow(impact) {
  const now = new Date()
  return {
    date: formatDateKey(now),
    label: now.toLocaleDateString('en-US', { weekday: 'short' }),
    total: impact.totalKg,
    ...impact.byCategory,
  }
}

function makeFoodLog({ entries, impact, preference }) {
  const dateKey = formatDateKey()
  const meals = entries.map((entry, index) => {
    const item = impact.items[index] || estimateItemImpact(entry)
    return {
      id: `${entry.slot}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      slot: entry.slot,
      label: entry.label,
      name: entry.name,
      quantity: entry.quantity,
      unit: entry.unit,
      kg: item.kg,
      category: item.category,
    }
  })

  return {
    id: `food-${dateKey}-${Date.now()}`,
    date: dateKey,
    createdAt: new Date().toISOString(),
    preference: preference.trim(),
    meals,
    totalKg: impact.totalKg,
    byCategory: impact.byCategory,
  }
}

function aggregateFoodLogs(foodLogs) {
  const dailyMap = new Map()

  foodLogs.forEach((log) => {
    const existing =
      dailyMap.get(log.date) ||
      {
        date: log.date,
        label: formatShortDate(log.date),
        total: 0,
        food: 0,
        transport: 0,
        energy: 0,
        shopping: 0,
        meals: [],
        logs: 0,
      }

    existing.total += log.totalKg || 0
    existing.food += log.byCategory?.food || 0
    existing.transport += log.byCategory?.transport || 0
    existing.energy += log.byCategory?.energy || 0
    existing.shopping += log.byCategory?.shopping || 0
    existing.meals.push(...(log.meals || []))
    existing.logs += 1
    dailyMap.set(log.date, existing)
  })

  return [...dailyMap.values()]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((row, index, rows) => {
      const sample = rows.slice(Math.max(0, index - 2), index + 1)
      const movingAverage = sample.reduce((sum, entry) => sum + entry.total, 0) / sample.length
      return {
        ...row,
        total: Number(row.total.toFixed(2)),
        food: Number(row.food.toFixed(2)),
        transport: Number(row.transport.toFixed(2)),
        energy: Number(row.energy.toFixed(2)),
        shopping: Number(row.shopping.toFixed(2)),
        movingAverage: Number(movingAverage.toFixed(2)),
      }
    })
}

function buildReportTimeline(rows, days = 7) {
  if (!rows.length) {
    const today = new Date()
    return Array.from({ length: days }, (_, index) => {
      const date = new Date(today)
      date.setDate(today.getDate() - (days - 1 - index))
      const key = formatDateKey(date)
      return {
        date: key,
        label: formatShortDate(key),
        total: 0,
        food: 0,
        transport: 0,
        energy: 0,
        shopping: 0,
        movingAverage: null,
        hasLog: false,
      }
    })
  }

  const hasIsoDates = rows.every((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date || ''))
  if (!hasIsoDates) {
    return rows.slice(-days).map((row) => ({
      ...row,
      label: row.label || row.date,
      hasLog: true,
    }))
  }

  const byDate = new Map(rows.map((row) => [row.date, row]))
  const endDate = new Date(`${rows[rows.length - 1].date}T12:00:00`)

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(endDate)
    date.setDate(endDate.getDate() - (days - 1 - index))
    const key = formatDateKey(date)
    const row = byDate.get(key)

    return {
      date: key,
      label: formatShortDate(key),
      total: row?.total || 0,
      food: row?.food || 0,
      transport: row?.transport || 0,
      energy: row?.energy || 0,
      shopping: row?.shopping || 0,
      movingAverage: row?.movingAverage ?? null,
      hasLog: Boolean(row),
    }
  })
}

function makeAnonymousId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID()
  return `anon-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function readPrivacyMetrics() {
  try {
    const saved = JSON.parse(localStorage.getItem(analyticsKey))
    return {
      anonymousId: saved?.anonymousId || makeAnonymousId(),
      firstSeen: saved?.firstSeen || new Date().toISOString(),
      visits: Number(saved?.visits) || 0,
      entries: Number(saved?.entries) || 0,
      days: Array.isArray(saved?.days) ? saved.days : [],
    }
  } catch {
    return {
      anonymousId: makeAnonymousId(),
      firstSeen: new Date().toISOString(),
      visits: 0,
      entries: 0,
      days: [],
    }
  }
}

function classifyUsageEvent(sourceLabel = '') {
  const normalized = sourceLabel.toLowerCase()
  if (normalized.includes('route')) return 'routes'
  if (normalized.includes('diet') || normalized.includes('food')) return 'diets'
  return 'scans'
}

function recordLocalUsage(current, eventType = 'visit', totalKg = 0) {
  const today = formatDateKey()
  const safeTotal = Number.isFinite(totalKg) ? Math.max(0, totalKg) : 0
  const existingDay = current.days.find((day) => day.date === today)
  const nextDay = {
    date: today,
    label: formatShortDate(today),
    visits: existingDay?.visits || 0,
    entries: existingDay?.entries || 0,
    scans: existingDay?.scans || 0,
    routes: existingDay?.routes || 0,
    diets: existingDay?.diets || 0,
    totalKg: existingDay?.totalKg || 0,
  }

  if (eventType === 'visit') {
    nextDay.visits += 1
  } else {
    nextDay.entries += 1
    nextDay[eventType] = (nextDay[eventType] || 0) + 1
    nextDay.totalKg = Number((nextDay.totalKg + safeTotal).toFixed(2))
  }

  return {
    ...current,
    visits: current.visits + (eventType === 'visit' ? 1 : 0),
    entries: current.entries + (eventType === 'visit' ? 0 : 1),
    days: [...current.days.filter((day) => day.date !== today), nextDay]
      .sort((left, right) => left.date.localeCompare(right.date))
      .slice(-30),
  }
}

function buildUsageTimeline(days = [], length = 7) {
  const byDate = new Map(
    days.map((day) => [
      day.date,
      {
        date: day.date,
        label: day.label || formatShortDate(day.date),
        visits: Number(day.visits) || 0,
        entries: Number(day.entries) || 0,
        scans: Number(day.scans) || 0,
        routes: Number(day.routes) || 0,
        diets: Number(day.diets) || 0,
        uniqueUsers: Number(day.unique_users || day.uniqueUsers) || 0,
        totalKg: Number(day.total_kg ?? day.totalKg) || 0,
      },
    ]),
  )
  const today = new Date()

  return Array.from({ length }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (length - 1 - index))
    const key = formatDateKey(date)
    const existing = byDate.get(key)
    return {
      date: key,
      label: formatShortDate(key),
      visits: existing?.visits || 0,
      entries: existing?.entries || 0,
      scans: existing?.scans || 0,
      routes: existing?.routes || 0,
      diets: existing?.diets || 0,
      uniqueUsers: existing?.uniqueUsers || (existing?.visits || existing?.entries ? 1 : 0),
      totalKg: Number((existing?.totalKg || 0).toFixed(2)),
    }
  })
}

function FoodTimelineTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null

  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {row.hasLog ? (
        <>
          <span>{formatKg(row.total)} kg CO2e</span>
          <small>{row.movingAverage ? `${formatKg(row.movingAverage)} kg moving average` : 'First logged food day'}</small>
        </>
      ) : (
        <>
          <span>No food log stored</span>
          <small>Log a meal day to turn this placeholder into a real report bar.</small>
        </>
      )}
    </div>
  )
}

function UsageTimelineTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null

  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      <span>{row.entries} saved action{row.entries === 1 ? '' : 's'}</span>
      <small>{row.visits} visit{row.visits === 1 ? '' : 's'} · {formatKg(row.totalKg)} kg analyzed</small>
    </div>
  )
}

function GhostLines({ count = 3, compact = false }) {
  return (
    <div className={`ghost-lines ${compact ? 'is-compact' : ''}`}>
      {Array.from({ length: count }, (_, index) => (
        <span className="ghost-line" key={index} />
      ))}
    </div>
  )
}

function SectionGhost({ variant = 'cards' }) {
  if (variant === 'summary') {
    return (
      <div className="section-ghost summary-ghost">
        <div className="ghost-card ghost-card-tall">
          <div className="ghost-kicker" />
          <div className="ghost-title" />
          <GhostLines count={3} />
          <div className="ghost-pill-row">
            <span className="ghost-pill" />
            <span className="ghost-pill ghost-pill-short" />
          </div>
        </div>
        <div className="ghost-card">
          <div className="ghost-grid ghost-grid-rows">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="ghost-list-row" key={index}>
                <span className="ghost-icon" />
                <div>
                  <div className="ghost-line ghost-line-medium" />
                  <div className="ghost-line ghost-line-long" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'split') {
    return (
      <div className="section-ghost split-ghost">
        <div className="ghost-card ghost-card-tall">
          <div className="ghost-kicker" />
          <div className="ghost-title" />
          <GhostLines count={4} />
          <div className="ghost-card-grid">
            <div className="ghost-input" />
            <div className="ghost-input" />
            <div className="ghost-button" />
          </div>
        </div>
        <div className="ghost-card ghost-card-media">
          <div className="ghost-chart" />
          <GhostLines count={2} compact />
        </div>
      </div>
    )
  }

  if (variant === 'dashboard') {
    return (
      <div className="section-ghost dashboard-ghost">
        <div className="ghost-card ghost-card-wide">
          <div className="ghost-kicker" />
          <div className="ghost-title" />
          <div className="ghost-metric-grid">
            {Array.from({ length: 6 }, (_, index) => (
              <div className="ghost-stat" key={index}>
                <span className="ghost-line ghost-line-short" />
                <strong className="ghost-line ghost-line-medium" />
              </div>
            ))}
          </div>
        </div>
        <div className="ghost-card ghost-card-wide">
          <div className="ghost-chart ghost-chart-tall" />
        </div>
      </div>
    )
  }

  return (
    <div className="section-ghost cards-ghost">
      {Array.from({ length: 3 }, (_, index) => (
        <div className="ghost-card" key={index}>
          <div className="ghost-kicker" />
          <div className="ghost-title" />
          <GhostLines count={3} />
        </div>
      ))}
    </div>
  )
}

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function getLowTrafficWindows(dateValue) {
  const day = new Date(dateValue).getDay()
  if (day === 0) return ['6:30 AM', '10:30 AM', '2:00 PM']
  if (day === 6) return ['7:00 AM', '11:00 AM', '3:30 PM']
  return ['6:15 AM', '11:30 AM', '8:45 PM']
}

function buildDietEntries(plan) {
  const servings = Math.max(1, Number(plan.servings) || 1)
  return [
    { slot: 'breakfast', label: 'Breakfast', text: plan.breakfast },
    { slot: 'lunch', label: 'Lunch', text: plan.lunch },
    { slot: 'dinner', label: 'Dinner', text: plan.dinner },
    { slot: 'snack', label: 'Snack', text: plan.snack },
  ]
    .filter((entry) => entry.text.trim())
    .map((entry) => ({
      slot: entry.slot,
      label: entry.label,
      name: entry.text.trim(),
      quantity: servings,
      unit: 'item',
      source: `daily diet ${entry.slot}`,
    }))
}

function getDietSwapText(items, preference) {
  if (!items.length) return 'Type the meals you are actually planning to eat and CarbonLens will turn them into a live food day.'

  const topItem = [...items].sort((left, right) => right.kg - left.kg)[0]
  const saving = formatKg(topItem.kg * 0.35)
  const preferenceNote = preference.trim() ? ` within a ${preference.trim()} style` : ''

  return `${topItem.name} is the biggest lever today. A lighter swap${preferenceNote} could trim about ${saving} kg.`
}

function getUnderTargetStreak(history, target) {
  let streak = 0
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if ((history[index]?.total || 0) <= target) streak += 1
    else break
  }
  return streak
}

function parseFoodTextDraft(text) {
  return text
    .split(/,|\n| and /i)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((chunk) => {
      const parsed = parseQuantity(chunk)
      const cleaned = chunk.replace(/\d+(?:\.\d+)?\s*(kg|g|km|hours?|hrs?|litres?|liters?|l|cups?|items?)?/gi, '').trim()
      return {
        name: cleaned || chunk,
        quantity: parsed.quantity,
        unit: parsed.unit,
      }
    })
}

function App() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24 })
  const heroLift = useTransform(scrollYProgress, [0, 0.22], [0, -80])
  const [session, setSession] = useState(readSession)
  const [activeTool, setActiveTool] = useState('receipt')
  const [manualText, setManualText] = useState('2 samosas, 1 Uber 8km, 500g paneer')
  const [barcodeText, setBarcodeText] = useState('')
  const [status, setStatus] = useState('Ready for a receipt, barcode, route, or meal choice.')
  const [isBusy, setIsBusy] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [barcodeScanning, setBarcodeScanning] = useState(false)
  const [lastImage, setLastImage] = useState('/assets/scanner_screen.png')
  const [lastProduct, setLastProduct] = useState(null)
  const [articles, setArticles] = useState([])
  const [articlesLoading, setArticlesLoading] = useState(true)
  const [dietCards, setDietCards] = useState([])
  const [foodText, setFoodText] = useState('')
  const [origin, setOrigin] = useState('Kolkata')
  const [destination, setDestination] = useState('Darjeeling')
  const [routeMode, setRouteMode] = useState('transit')
  const [routeDate, setRouteDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [travelers, setTravelers] = useState(1)
  const [budget, setBudget] = useState(1500)
  const [trafficProfile, setTrafficProfile] = useState('low')
  const [foodStop, setFoodStop] = useState('protein')
  const [userLocation, setUserLocation] = useState(null)
  const [routeKm, setRouteKm] = useState(620)
  const [routeSource, setRouteSource] = useState('fallback estimate')
  const [mapReady, setMapReady] = useState(false)
  const [isMusicOn, setIsMusicOn] = useState(false)
  const [dietPlan, setDietPlan] = useState(defaultDietPlan)
  const [carbonBudget, setCarbonBudget] = useState(3)
  const [privacyMetrics, setPrivacyMetrics] = useState(readPrivacyMetrics)
  const [remoteUsage, setRemoteUsage] = useState(null)
  const [impactProof, setImpactProof] = useState(null)
  const [sectionReady, setSectionReady] = useState({
    summary: false,
    scan: false,
    gallery: false,
    tours: false,
    diet: false,
    comparison: false,
    pulse: false,
    mirror: false,
    dashboard: false,
    final: false,
  })
  const [impact, setImpact] = useState(() =>
    makeImpactFromItems([
      { name: 'Organic bananas', quantity: 6, unit: 'item' },
      { name: 'Paneer', quantity: 0.2, unit: 'kg' },
      { name: 'Auto-rickshaw ride', quantity: 5, unit: 'km' },
    ]),
  )
  const [comparison, setComparison] = useState(() => {
    const anchor = pickAnchor(2.14)
    return {
      anchor,
      line: '2.14 kg CO2e feels like a Kolkata to Durgapur bus seat.',
      nudge: 'Swap paneer once this week and the whole scan drops sharply.',
    }
  })

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const barcodeVideoRef = useRef(null)
  const barcodeControlsRef = useRef(null)
  const mapRef = useRef(null)
  const openRouteRef = useRef(null)
  const audioRef = useRef(null)
  const didTrackVisitRef = useRef(false)

  useEffect(() => {
    const shotTarget = new URLSearchParams(window.location.search).get('shot')
    if (!shotTarget) return

    const timer = window.setTimeout(() => {
      if (shotTarget === 'toxic') {
        document.querySelector('.rive-fullscreen-tile.tone-toxic')?.scrollIntoView({ behavior: 'auto', block: 'center' })
      } else {
        scrollTo(shotTarget)
      }
    }, 600)

    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ city: session.city, history: session.history, foodLogs: session.foodLogs, returning: true }))
  }, [session])

  useEffect(() => {
    let cancelled = false
    createImpactProof({ impact, source: 'carbonlens-dashboard' })
      .then((proof) => {
        if (!cancelled) setImpactProof(proof)
      })
      .catch(() => {
        if (!cancelled) setImpactProof(null)
      })

    return () => {
      cancelled = true
    }
  }, [impact])

  useEffect(() => {
    localStorage.setItem(
      analyticsKey,
      JSON.stringify({
        anonymousId: privacyMetrics.anonymousId,
        firstSeen: privacyMetrics.firstSeen,
        visits: privacyMetrics.visits,
        entries: privacyMetrics.entries,
        days: privacyMetrics.days,
      }),
    )
  }, [privacyMetrics])

  useEffect(() => {
    if (didTrackVisitRef.current) return
    didTrackVisitRef.current = true

    setPrivacyMetrics((current) => {
      const next = recordLocalUsage(current, 'visit')
      recordUsageEvent({ anonymousId: next.anonymousId, eventType: 'visit' }).then((usage) => {
        if (usage) setRemoteUsage(usage)
      })
      return next
    })
  }, [])

  useEffect(() => {
    const cleanup = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      barcodeControlsRef.current?.stop()
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }
    return cleanup
  }, [])

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      startTransition(() => {
        setSectionReady({
          summary: true,
          scan: true,
          gallery: true,
          tours: true,
          diet: true,
          comparison: true,
          pulse: true,
          mirror: true,
          dashboard: true,
          final: true,
        })
      })
      return undefined
    }

    const plan = [
      { key: 'summary', delay: 120 },
      { key: 'scan', delay: 220 },
      { key: 'gallery', delay: 320 },
      { key: 'tours', delay: 430 },
      { key: 'diet', delay: 540 },
      { key: 'comparison', delay: 650 },
      { key: 'pulse', delay: 760 },
      { key: 'mirror', delay: 860 },
      { key: 'dashboard', delay: 980 },
      { key: 'final', delay: 1080 },
    ]

    const timers = plan.map(({ key, delay }) =>
      window.setTimeout(() => {
        startTransition(() => {
          setSectionReady((current) => ({ ...current, [key]: true }))
        })
      }, delay),
    )

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [])

  useEffect(() => {
    async function hydrateLiveData() {
      try {
        const freshArticles = await fetchArticles()
        setArticles(freshArticles)
      } finally {
        setArticlesLoading(false)
      }
    }

    hydrateLiveData()
  }, [])

  useEffect(() => {
    if (!mapRef.current || openRouteRef.current) return undefined

    try {
      openRouteRef.current = renderOpenRouteMap({ mapElement: mapRef.current })
      setMapReady(Boolean(openRouteRef.current))
      openRouteRef.current
        ?.route('Kolkata', 'Darjeeling', 'transit')
        .then((km) => {
          setRouteKm(km)
          setRouteSource('OSM + OSRM route')
        })
        .catch(() => {
          setRouteKm(estimateRouteDistance('Kolkata', 'Darjeeling'))
          setRouteSource('Open fallback estimate')
        })
    } catch {
      setMapReady(false)
    }

    return () => {
      openRouteRef.current?.destroy()
      openRouteRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!foodText.trim()) return undefined

    const draftItems = parseFoodTextDraft(foodText)
    if (draftItems.length) {
      refreshFoodCards(draftItems, { hydrateImages: false })
    }

    const timeout = window.setTimeout(async () => {
      try {
        const items = await parseManualInput(foodText)
        await refreshFoodCards(items)
      } catch {
        // Keep the last successful cards visible while the user is typing.
      }
    }, 650)

    return () => window.clearTimeout(timeout)
  }, [foodText])

  const categoryRows = useMemo(
    () => Object.entries(impact.byCategory).map(([name, value]) => ({ name, value, fill: categoryColors[name] })),
    [impact],
  )
  const historySeries = useMemo(
    () =>
      session.history.map((row, index, history) => {
        const sample = history.slice(Math.max(0, index - 2), index + 1)
        const movingAverage = sample.reduce((sum, entry) => sum + entry.total, 0) / sample.length
        return {
          ...row,
          label: row.label || row.date,
          movingAverage: Number(movingAverage.toFixed(2)),
          targetGap: Number((row.total - carbonBudget).toFixed(2)),
        }
      }),
    [session.history, carbonBudget],
  )

  const congestion = trafficProfiles[trafficProfile]
  const selectedFoodStop = foodStopOptions.find((option) => option.id === foodStop) || foodStopOptions[0]
  const travelerCount = Math.max(1, Number(travelers) || 1)
  const routeCarKg = Number((calculateRouteImpact(routeKm, 'car') * travelerCount + selectedFoodStop.kg).toFixed(2))
  const routeGreenKg = Number((calculateRouteImpact(routeKm, routeMode) * congestion.multiplier * travelerCount + selectedFoodStop.kg).toFixed(2))
  const routeSaving = Math.max(0, Number((routeCarKg - routeGreenKg).toFixed(2)))
  const routeCost = Math.round(routeKm * (costPerKm[routeMode] || costPerKm.car) * travelerCount + selectedFoodStop.cost * travelerCount)
  const budgetDelta = budget - routeCost
  const healthyWindows = getLowTrafficWindows(routeDate)
  const dailyDietEntries = useMemo(() => buildDietEntries(dietPlan), [dietPlan])
  const dailyDietImpact = useMemo(
    () =>
      dailyDietEntries.length
        ? makeImpactFromItems(
            dailyDietEntries.map((entry) => ({
              name: entry.name,
              quantity: entry.quantity,
              unit: entry.unit,
              source: entry.source,
            })),
          )
        : { items: [], totalKg: 0, byCategory: { food: 0, transport: 0, energy: 0, shopping: 0 } },
    [dailyDietEntries],
  )
  const dailyDietKg = dailyDietImpact.totalKg
  const dailyDietSwap = getDietSwapText(dailyDietImpact.items, dietPlan.preference)
  const dailyFoodSeries = useMemo(() => aggregateFoodLogs(session.foodLogs || []), [session.foodLogs])
  const reportSeries = dailyFoodSeries.length ? dailyFoodSeries : historySeries
  const latestFoodLog = session.foodLogs?.length ? session.foodLogs[session.foodLogs.length - 1] : null
  const latestFoodDay = dailyFoodSeries.length ? dailyFoodSeries[dailyFoodSeries.length - 1] : null
  const foodDatabaseTotal = dailyFoodSeries.reduce((sum, row) => sum + row.total, 0)
  const mealCount = session.foodLogs?.reduce((sum, log) => sum + (log.meals?.length || 0), 0) || 0
  const topTrackedMeal = [...(latestFoodDay?.meals || [])].sort((left, right) => right.kg - left.kg)[0]
  const chartWindow = useMemo(() => buildReportTimeline(dailyFoodSeries.length ? dailyFoodSeries : reportSeries, 7), [dailyFoodSeries, reportSeries])
  const loggedChartDays = chartWindow.filter((row) => row.hasLog).length
  const usageSourceDays = remoteUsage?.days?.length ? remoteUsage.days : privacyMetrics.days
  const privacyTimeline = useMemo(() => buildUsageTimeline(usageSourceDays, 7), [usageSourceDays])
  const uniqueBrowserCount = remoteUsage?.unique_users || (privacyMetrics.visits ? 1 : 0)
  const privacyEntryCount = Math.max(privacyMetrics.entries, session.history.length)
  const activeUsageDays = new Set([
    ...privacyMetrics.days.filter((day) => day.visits || day.entries).map((day) => day.date),
    ...(session.foodLogs || []).map((log) => log.date),
  ]).size
  const categorySourceSeries = dailyFoodSeries.length ? dailyFoodSeries : reportSeries
  const foodReportCategories = ['food', 'transport', 'energy', 'shopping']
    .map((category) => ({
      category,
      fill: categoryColors[category],
      label: category.charAt(0).toUpperCase() + category.slice(1),
      value: Number(categorySourceSeries.reduce((sum, row) => sum + (row[category] || 0), 0).toFixed(2)),
    }))
    .sort((left, right) => right.value - left.value)
  const foodReportCategory = foodReportCategories[0] || { category: 'food', value: 0 }
  const chartPeak = loggedChartDays ? chartWindow.filter((row) => row.hasLog).reduce((winner, row) => (row.total > winner.total ? row : winner)) : null
  const latestChartDay = loggedChartDays ? [...chartWindow].reverse().find((row) => row.hasLog) : null
  const latestTargetDelta = latestChartDay ? Number((latestChartDay.total - carbonBudget).toFixed(2)) : 0
  const chartTargetStatus = !latestChartDay ? 'No logged food day yet' : latestTargetDelta <= 0 ? `${formatKg(Math.abs(latestTargetDelta))} kg under target` : `${formatKg(latestTargetDelta)} kg over target`
  const carbonDial = Math.min(100, Math.round((impact.totalKg / 12) * 100))
  const latestDay = reportSeries.length ? reportSeries[reportSeries.length - 1] : null
  const weeklyAverage = reportSeries.length
    ? Number((reportSeries.reduce((sum, row) => sum + row.total, 0) / reportSeries.length).toFixed(2))
    : 0
  const bestDay = reportSeries.length
    ? reportSeries.reduce((winner, row) => (row.total < winner.total ? row : winner), reportSeries[0])
    : { date: '—', total: 0 }
  const overBudgetDays = reportSeries.length ? reportSeries.filter((row) => row.total > carbonBudget).length : 0
  const underTargetStreak = getUnderTargetStreak(reportSeries, carbonBudget)
  const monthProjection = Number((weeklyAverage * 30).toFixed(1))
  const largestCategory = [...categoryRows].sort((left, right) => right.value - left.value)[0]
  const topImpactItem = [...impact.items].sort((left, right) => right.kg - left.kg)[0]
  // Keep the section stable while the user types; only reflect actual rendered cards.
  const visibleDietCards = dietCards
  const foodPromptTokens = foodText
    .split(/,|\n| and /i)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .slice(0, 6)
  const dashboardInsight =
    weeklyAverage <= carbonBudget
      ? `You are ${formatKg(carbonBudget - weeklyAverage)} kg under your daily target on average.`
      : `Cut ${formatKg(weeklyAverage - carbonBudget)} kg per day to meet your target.`
  const reductionPlan = useMemo(
    () => buildReductionPlan({ impact, history: reportSeries, carbonBudget, city: session.city }),
    [impact, reportSeries, carbonBudget, session.city],
  )

  const weeklyMirror = useMemo(() => {
    const history = session.history

    if (!history.length) {
      return {
        average: 0,
        best: { date: '—', total: 0 },
        topCategory: { category: 'food', value: 0 },
        suggestion: 'Log your first scan or diet entry to start your weekly mirror.',
      }
    }

    const average = history.reduce((sum, row) => sum + row.total, 0) / history.length
    const best = history.reduce((winner, row) => (row.total < winner.total ? row : winner), history[0])
    const topCategory = ['food', 'transport', 'energy', 'shopping']
      .map((category) => ({ category, value: history.reduce((sum, row) => sum + (row[category] || 0), 0) }))
      .sort((a, b) => b.value - a.value)[0]

    return {
      average,
      best,
      topCategory,
      suggestion: {
        food: 'Make one dairy-heavy meal plant-forward.',
        transport: 'Replace one short cab ride with metro or auto share.',
        energy: 'Run the fan first and delay AC by 30 minutes.',
        shopping: 'Delay one impulse buy for 24 hours.',
      }[topCategory.category],
    }
  }, [session.history])

  function queueUsageEvent(eventType, totalKg = 0) {
    setPrivacyMetrics((current) => {
      const next = recordLocalUsage(current, eventType, totalKg)
      recordUsageEvent({ anonymousId: next.anonymousId, eventType, totalKg }).then((usage) => {
        if (usage) setRemoteUsage(usage)
      })
      return next
    })
  }

  async function commitImpact(nextImpact, { sourceLabel, refreshCards = true, finalStatus } = {}) {
    setImpact(nextImpact)
    if (refreshCards) await refreshFoodCards(nextImpact.items)
    setStatus('Selecting a human-scale comparison...')
    const phrased = await phraseComparison({
      totalKg: nextImpact.totalKg,
      city: session.city,
      returning: session.returning,
      history: session.history,
    })
    setComparison(phrased)
    setSession((current) => ({ ...current, history: [...current.history.slice(-13), makeHistoryRow(nextImpact)], returning: true }))
    queueUsageEvent(classifyUsageEvent(sourceLabel), nextImpact.totalKg)
    setStatus(finalStatus || `${sourceLabel} analyzed. Impact saved locally.`)
  }

  async function finishImpact(rawItems, sourceLabel) {
    const computed = makeImpactFromItems(rawItems)
    await commitImpact(computed, { sourceLabel, refreshCards: true })
  }

  async function refreshFoodCards(rawItems, { hydrateImages = true } = {}) {
    if (!rawItems.length) {
      setDietCards([])
      return
    }
    const baseCards = rawItems.slice(0, 6).map((rawItem) => {
      const item = estimateItemImpact(rawItem)
      return {
        name: item.name,
        image: '/assets/imag5.jpeg',
        saving: Math.max(0.05, Number((item.kg * 0.45).toFixed(2))),
        swap:
          item.category === 'transport'
            ? 'Try transit, rail, bike, or low-congestion timing.'
            : item.kg > 1
              ? 'Try a plant-forward or smaller-portion version.'
              : 'Keep it as a low-carbon repeat choice.',
        category: item.category,
        kg: item.kg,
        unit: item.unit,
      }
    })

    setDietCards(baseCards)

    if (!hydrateImages) return

    const hydratedCards = await Promise.all(
      baseCards.map(async (card) => {
        const imageQuery =
          card.category === 'transport'
            ? `${card.name} city commute`
            : card.category === 'energy'
              ? `${card.name} home appliance`
              : `${card.name} plated food`
        const image = await fetchFoodImage(imageQuery).catch(() => '/assets/imag5.jpeg')
        return { ...card, image }
      }),
    )

    if (hydratedCards.length) setDietCards(hydratedCards)
  }

  async function handleReceiptFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const validationError = validateReceiptFileMeta(file)
    if (validationError) {
      setStatus(validationError)
      event.target.value = ''
      return
    }

    setIsBusy(true)
    setStatus('Reading receipt image...')
    try {
      const dataUrl = await fileToDataUrl(file)
      setLastImage(dataUrl)
      setStatus('AI is extracting purchasable line items...')
      await finishImpact(await parseReceiptImage(dataUrl), 'Receipt')
    } catch (error) {
      setStatus(`Receipt scan failed: ${error.message}`)
    } finally {
      setIsBusy(false)
      event.target.value = ''
    }
  }

  async function startCamera() {
    try {
      setStatus('Opening camera...')
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      setCameraOn(true)
      if (videoRef.current) videoRef.current.srcObject = stream
      setStatus('Camera ready. Capture when the receipt fills the frame.')
    } catch (error) {
      setStatus(`Camera blocked: ${error.message}`)
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraOn(false)
  }

  async function captureReceipt() {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    setLastImage(dataUrl)
    stopCamera()
    setIsBusy(true)
    setStatus('AI is extracting receipt items from the captured frame...')
    try {
      await finishImpact(await parseReceiptImage(dataUrl), 'Camera receipt')
    } catch (error) {
      setStatus(`Camera scan failed: ${error.message}`)
    } finally {
      setIsBusy(false)
    }
  }

  async function handleManualSubmit(event) {
    event.preventDefault()
    setIsBusy(true)
    setStatus('Parsing natural language input...')
    try {
      setLastImage('/assets/results_card.png')
      await finishImpact(await parseManualInput(manualText), 'Manual input')
    } catch (error) {
      setStatus(`Manual parse failed: ${error.message}`)
    } finally {
      setIsBusy(false)
    }
  }

  async function handleFoodTextSubmit(event) {
    event.preventDefault()
    if (!foodText.trim()) {
      setDietCards([])
      setStatus('Type the foods you actually want to visualize.')
      return
    }
    setIsBusy(true)
    setStatus('Building food cards from your text...')
    try {
      const items = await parseManualInput(foodText)
      await finishImpact(items, 'Food list')
    } catch (error) {
      setStatus(`Food lookup failed: ${error.message}`)
    } finally {
      setIsBusy(false)
    }
  }

  async function runBarcodeLookup(code) {
    const trimmed = code.trim()
    if (!trimmed) return

    setIsBusy(true)
    setStatus('Checking Open Food Facts...')
    try {
      const product = await lookupBarcode(trimmed)
      setLastProduct(product)
      setLastImage(product.image || '/assets/category_icons.png')
      await finishImpact([{ name: product.name || product.category, quantity: 1, unit: 'item' }], 'Barcode')
    } catch (error) {
      setStatus(`Barcode lookup failed: ${error.message}`)
    } finally {
      setIsBusy(false)
    }
  }

  async function startBarcodeScanner() {
    setBarcodeScanning(true)
    setStatus('Point the camera at an EAN-13 or UPC barcode...')
    const reader = new BrowserMultiFormatReader()
    try {
      barcodeControlsRef.current = await reader.decodeFromVideoDevice(undefined, barcodeVideoRef.current, (result) => {
        if (result) {
          const text = result.getText()
          setBarcodeText(text)
          stopBarcodeScanner()
          runBarcodeLookup(text)
        }
      })
    } catch (error) {
      setBarcodeScanning(false)
      setStatus(`Barcode camera failed: ${error.message}`)
    }
  }

  function stopBarcodeScanner() {
    barcodeControlsRef.current?.stop()
    barcodeControlsRef.current = null
    setBarcodeScanning(false)
  }

  async function calculateRoute(event) {
    event.preventDefault()
    setIsBusy(true)
    setStatus('Calculating route distance...')
    try {
      let km = null
      let source = 'Open fallback estimate'
      if (openRouteRef.current) {
        km = await openRouteRef.current.route(origin, destination, routeMode)
        source = 'OSM + OSRM route'
      }
      if (!km) {
        km = estimateRouteDistance(origin, destination)
      }
      const food = foodStopOptions.find((option) => option.id === foodStop) || foodStopOptions[0]
      const routeKg = Number((calculateRouteImpact(km, routeMode) * trafficProfiles[trafficProfile].multiplier * travelerCount + food.kg).toFixed(2))
      setRouteSource(source)
      setRouteKm(km)
      await commitImpact({
        items: [
          {
            name: `${routeMode} route: ${origin} to ${destination}`,
            quantity: km,
            unit: 'km',
            category: 'transport',
            kg: Number((routeKg - food.kg).toFixed(2)),
            source,
          },
          {
            name: `${food.label} travel stop`,
            quantity: 1,
            unit: 'meal',
            category: 'food',
            kg: food.kg,
            source: 'route food option',
          },
        ],
        totalKg: routeKg,
        byCategory: { food: food.kg, transport: Number((routeKg - food.kg).toFixed(2)), energy: 0, shopping: 0 },
      }, {
        sourceLabel: 'Route plan',
        refreshCards: false,
        finalStatus: `${origin} to ${destination}: ${formatKg(km)} km via ${source}.`,
      })
    } catch {
      const km = estimateRouteDistance(origin, destination)
      const food = foodStopOptions.find((option) => option.id === foodStop) || foodStopOptions[0]
      const routeKg = Number((calculateRouteImpact(km, routeMode) * trafficProfiles[trafficProfile].multiplier * travelerCount + food.kg).toFixed(2))
      setRouteKm(km)
      setRouteSource('Open fallback estimate')
      await commitImpact({
        items: [
          {
            name: `${routeMode} route: ${origin} to ${destination}`,
            quantity: km,
            unit: 'km',
            category: 'transport',
            kg: Number((routeKg - food.kg).toFixed(2)),
            source: 'Open fallback estimate',
          },
          {
            name: `${food.label} travel stop`,
            quantity: 1,
            unit: 'meal',
            category: 'food',
            kg: food.kg,
            source: 'route food option',
          },
        ],
        totalKg: routeKg,
        byCategory: { food: food.kg, transport: Number((routeKg - food.kg).toFixed(2)), energy: 0, shopping: 0 },
      }, {
        sourceLabel: 'Route plan',
        refreshCards: false,
        finalStatus: `Free map route unavailable, using fallback estimate for ${origin} to ${destination}.`,
      })
    } finally {
      setIsBusy(false)
    }
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setStatus('Geolocation is not available in this browser.')
      return
    }

    setStatus('Finding your current location...')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: Number(position.coords.latitude.toFixed(4)),
          lng: Number(position.coords.longitude.toFixed(4)),
        }
        setUserLocation(coords)
        setOrigin(`${coords.lat}, ${coords.lng}`)
        openRouteRef.current?.locate(coords)
        setStatus('Current location added as route origin.')
      },
      (error) => setStatus(`Location blocked: ${error.message}`),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  async function applyDailyDiet(event) {
    event.preventDefault()
    if (!dailyDietEntries.length) {
      setStatus('Add at least one real meal before logging your daily diet.')
      return
    }
    setIsBusy(true)

    try {
      const foodLog = makeFoodLog({ entries: dailyDietEntries, impact: dailyDietImpact, preference: dietPlan.preference })
      setSession((current) => ({
        ...current,
        foodLogs: [...(current.foodLogs || []), foodLog].slice(-90),
        returning: true,
      }))
      await commitImpact(
        dailyDietImpact,
        {
          sourceLabel: 'Daily diet',
          refreshCards: true,
          finalStatus: `Daily diet logged: ${formatKg(dailyDietKg)} kg CO2e. ${dailyDietSwap}`,
        },
      )
    } finally {
      setIsBusy(false)
    }
  }

  function startAmbient() {
    try {
      if (!audioRef.current) {
        const soundtrack = new Audio(soundtrackSrc)
        soundtrack.loop = true
        soundtrack.preload = 'auto'
        soundtrack.volume = 0.42
        audioRef.current = soundtrack
      }

      audioRef.current
        .play()
        .then(() => {
          setIsMusicOn(true)
          setStatus('Crown of Black is playing.')
        })
        .catch((error) => {
          setIsMusicOn(false)
          setStatus(`Music failed: ${error.message}`)
        })
    } catch (error) {
      setStatus(`Music failed: ${error.message}`)
    }
  }

  function stopAmbient() {
    if (!audioRef.current) return
    audioRef.current.pause()
    setIsMusicOn(false)
    setStatus('Crown of Black paused.')
  }

  const AnchorIcon = iconMap[comparison.anchor?.icon] || Sparkles
  const activeVideo = videoAssets[Math.min(videoAssets.length - 1, Math.floor((impact.totalKg || 0) % videoAssets.length))]

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to CarbonLens app</a>
      <motion.div aria-hidden="true" className="scroll-progress" style={{ scaleX }} />
      <header className="topbar glass">
        <button aria-label="Go to CarbonLens home" className="brand" onClick={() => scrollTo('home')} type="button">
          <span className="brand-mark"><img src="/favicon.svg?v=3" alt="" aria-hidden="true" /></span>
          <span>CarbonLens</span>
        </button>
        <nav className="topnav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => scrollTo(item.id)} type="button">{item.label}</button>
          ))}
        </nav>
        <button aria-pressed={isMusicOn} className="audio-toggle" onClick={isMusicOn ? stopAmbient : startAmbient} type="button">
          {isMusicOn ? <Pause size={16} /> : <Play size={16} />}
          Crown of Black
        </button>
      </header>

      <main id="main-content">
        <section id="home" className="hero cinematic">
          <video aria-hidden="true" className="hero-video" src="/assets/vid1.mp4" autoPlay muted loop playsInline />
          <video aria-hidden="true" className="hero-video hero-video-secondary" src="/assets/vid2.mp4" autoPlay muted loop playsInline />
          <img className="hero-media soft-blend" src="/assets/hero_illustration.png" alt="Receipt under a magnifying glass with carbon annotations" decoding="async" fetchPriority="high" />
          <img className="hero-media hero-media-secondary" src="/assets/imag12.jpeg" alt="" aria-hidden="true" decoding="async" />
          <div className="hero-shade" />
          <motion.div className="hero-content reveal" style={{ y: heroLift }} initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }}>
            <p className="eyebrow">Immersive cinematic carbon tracking</p>
            <h1>Point. Scan. Feel.</h1>
            <p className="hero-copy">
              CarbonLens turns receipts, routes, barcodes, and meals into local comparisons people can understand before the moment passes.
            </p>
            <div className="hero-actions">
              <button className="primary-action" onClick={() => scrollTo('scan')} type="button">
                Open scanner <ArrowRight size={18} />
              </button>
              <button className="secondary-action dark" onClick={() => scrollTo('tours')} type="button">
                Plan a route <Route size={18} />
              </button>
              <span className="live-pill"><Zap size={16} /> Local-first. API-enhanced.</span>
            </div>
          </motion.div>
          <ChevronDown aria-hidden="true" className="scroll-cue" size={28} />
        </section>

        <section className="summary-section premium-section" aria-label="CarbonLens section guide">
          <video aria-hidden="true" className="section-video" src="/assets/vid6.mp4" autoPlay muted loop playsInline />
          <img className="section-backdrop is-left is-tight" src="/assets/imag6.jpeg" alt="" aria-hidden="true" />
          <img className="section-backdrop is-right is-upper is-soft" src="/assets/imag11.jpeg" alt="" aria-hidden="true" />
          {sectionReady.summary ? (
            <div className="summary-layout reveal">
              <aside className="summary-sidebar">
                <span>Section guide</span>
                <h2>What each part does.</h2>
                <p>CarbonLens is arranged as a working flow: estimate, compare, store, then report.</p>
                <div className="summary-actions">
                  <button className="primary-action compact" onClick={() => scrollTo('scan')} type="button">Start with Scan <ArrowRight size={17} /></button>
                  <button className="secondary-action" onClick={() => scrollTo('dashboard')} type="button">Open Report <Database size={17} /></button>
                </div>
              </aside>
              <div className="summary-main">
                <div className="summary-list">
                  {sectionGuideItems.map(({ id, label, action, hint, icon: Icon }) => (
                    <button className="summary-row" key={id} onClick={() => scrollTo(id)} type="button">
                      <Icon size={19} />
                      <span>{label}</span>
                      <strong>{action}</strong>
                      <small>{hint}</small>
                    </button>
                  ))}
                </div>
                <figure className="summary-image">
                  <img src="/assets/dashboard_mockup.png" alt="CarbonLens dashboard report preview" loading="lazy" decoding="async" />
                  <figcaption>
                    <span>Local-first database</span>
                    <strong>Meal logs become daily CO2e reports.</strong>
                  </figcaption>
                </figure>
              </div>
            </div>
          ) : (
            <SectionGhost variant="summary" />
          )}
        </section>

        <section id="scan" className="workspace-section scenic-section">
          {sectionReady.scan ? (
            <>
              <video aria-hidden="true" className="section-video" src={activeVideo} autoPlay muted loop playsInline />
              <img className="section-backdrop is-left is-soft" src="/assets/imag7.jpeg" alt="" aria-hidden="true" />
              <img className="section-backdrop is-right is-tight" src="/assets/imag1.jpeg" alt="" aria-hidden="true" />
              <div className="section-heading reveal">
                <p className="eyebrow">Scan studio</p>
                <h2>Decision-moment blindness, gone.</h2>
                <p>Upload a receipt, scan a barcode, or type the choice in plain English. The result lands in the same comparison engine.</p>
              </div>

              <div className="tool-grid reveal">
                <div className="tool-panel glass-card">
                  <div className="segmented-control" role="tablist" aria-label="Carbon input method">
                    {scannerTabs.map(({ id, label, icon: Icon }) => (
                      <button aria-selected={activeTool === id} className={activeTool === id ? 'is-active' : ''} key={id} onClick={() => setActiveTool(id)} role="tab" type="button">
                        <Icon size={17} />
                        {label}
                      </button>
                    ))}
                  </div>

                  {activeTool === 'receipt' && (
                    <div className="input-stack">
                      <div className="drop-zone">
                        <Upload size={28} />
                        <div>
                          <h3>Upload a grocery or restaurant receipt</h3>
                          <p>AI extracts line items. Static factors keep the demo alive through cold starts.</p>
                        </div>
                        <label className="file-button">
                          Choose image
                          <input accept="image/png,image/jpeg,image/webp" aria-label="Choose receipt image" onChange={handleReceiptFile} type="file" />
                        </label>
                      </div>

                      <div className="camera-box">
                        <div>
                          <h3>Use webcam</h3>
                          <p>Capture a receipt frame directly from the browser.</p>
                        </div>
                        <div className="camera-actions">
                          {!cameraOn ? (
                            <button className="secondary-action" onClick={startCamera} type="button"><Camera size={17} /> Open camera</button>
                          ) : (
                            <>
                              <button className="primary-action compact" onClick={captureReceipt} type="button"><ScanLine size={17} /> Capture</button>
                              <button className="ghost-action" onClick={stopCamera} type="button">Stop</button>
                            </>
                          )}
                        </div>
                        <video aria-label="Receipt camera preview" className={cameraOn ? 'camera-preview is-live' : 'camera-preview'} ref={videoRef} autoPlay muted playsInline />
                      </div>
                    </div>
                  )}

                  {activeTool === 'barcode' && (
                    <div className="input-stack">
                      <form className="inline-form" onSubmit={(event) => {
                        event.preventDefault()
                        runBarcodeLookup(barcodeText)
                      }}>
                        <label htmlFor="barcode">EAN-13 or UPC barcode</label>
                        <div className="field-row">
                          <input id="barcode" inputMode="numeric" onChange={(event) => setBarcodeText(event.target.value)} placeholder="8901030865260" value={barcodeText} />
                          <button className="primary-action compact" type="submit">Lookup <ArrowRight size={17} /></button>
                        </div>
                      </form>
                      <div className="camera-box">
                        <div>
                          <h3>Live barcode scanner</h3>
                          <p>ZXing reads the code; Open Food Facts enriches the product.</p>
                        </div>
                        <div className="camera-actions">
                          {!barcodeScanning ? (
                            <button className="secondary-action" onClick={startBarcodeScanner} type="button"><Barcode size={17} /> Start scanner</button>
                          ) : (
                            <button className="ghost-action" onClick={stopBarcodeScanner} type="button">Stop</button>
                          )}
                        </div>
                        <video aria-label="Barcode camera preview" className={barcodeScanning ? 'camera-preview is-live' : 'camera-preview'} ref={barcodeVideoRef} autoPlay muted playsInline />
                      </div>
                      {lastProduct && (
                        <div className="product-strip">
                          {lastProduct.image && <img src={lastProduct.image} alt={`${lastProduct.name} package`} loading="lazy" decoding="async" />}
                          <div><strong>{lastProduct.name}</strong><span>{lastProduct.brand}</span></div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTool === 'manual' && (
                    <form className="manual-form" onSubmit={handleManualSubmit}>
                      <label htmlFor="manual">Type anything you chose today</label>
                      <textarea id="manual" onChange={(event) => setManualText(event.target.value)} rows={7} value={manualText} />
                      <button className="primary-action" type="submit">Analyze text <ArrowRight size={18} /></button>
                    </form>
                  )}

                  <div className="status-line" aria-live="polite">
                    {isBusy ? <Loader2 className="spin" size={18} /> : <CheckCircle2 size={18} />}
                    {status}
                  </div>
                </div>

                <div className="result-panel glass-card">
                  <div className="visual-frame"><img src={lastImage} alt="CarbonLens scan preview" /></div>
                  <div className="impact-summary">
                    <div><span>Total impact</span><strong>{formatKg(impact.totalKg)} kg CO2e</strong></div>
                    <div className="carbon-dial" style={{ '--dial': `${carbonDial}%` }}>
                      <span />
                      <b>{carbonDial}</b>
                      <small>carbon pressure</small>
                    </div>
                    <div className="anchor-badge"><AnchorIcon size={24} /><span>{comparison.line}</span></div>
                    <p>{comparison.nudge}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <SectionGhost variant="split" />
          )}
        </section>

        <section className="rive-fullscreen" aria-label="Rive carbon mood signal gallery">
          <motion.div className="section-heading reveal" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
            <p className="eyebrow">Signal gallery</p>
            <h2>Three carbon moods — big, readable, alive.</h2>
            <p>These Rive scenes are now a dedicated fullscreen section. Type, scan, and feel the shift.</p>
          </motion.div>

          <div className="rive-fullscreen-grid reveal">
            {riveShowcaseItems.map((item, index) => (
              <motion.section
                className={`rive-fullscreen-tile tone-${item.tone}`}
                key={item.src}
                variants={fadeUp}
                initial="hidden"
                animate="show"
                whileHover={{ y: -6 }}
                transition={{ delay: index * 0.04 }}
              >
                {item.tone === 'toxic'
                  ? <ToxicRiveScene item={item} />
                  : <AmbientRive icon={item.icon} label={item.label} src={item.src} tone={item.tone} compact={false} />}
                <div className="rive-fullscreen-tile-copy">
                  <span>{item.label}</span>
                  <h3>{item.sceneTitle || item.title}</h3>
                  <p>{item.description}</p>
                  {item.actionTarget && (
                    <button className="rive-tile-action" onClick={() => scrollTo(item.actionTarget)} type="button">
                      {item.actionLabel} <ArrowRight size={17} />
                    </button>
                  )}
                </div>
              </motion.section>
            ))}
          </div>
        </section>


        <section id="tours" className="tours-section premium-section">
          <video aria-hidden="true" className="section-video" src="/assets/vid3.mp4" autoPlay muted loop playsInline />
          <img className="section-backdrop is-left" src="/assets/imag8.jpeg" alt="" aria-hidden="true" />
          <img className="section-backdrop is-right is-upper is-soft" src="/assets/carbon-map-bg.png" alt="" aria-hidden="true" />
          <motion.div className="section-heading reveal" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }}>
            <p className="eyebrow">Dynamic route carbon</p>
            <h2>Any origin. Any destination.</h2>
            <p>OpenStreetMap powers the live map, OSRM calculates route distance, and Nominatim resolves places for demo-scale searches.</p>
          </motion.div>
          <motion.div className="route-grid reveal" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.18 }}>
            <form className="route-panel glass-card" onSubmit={calculateRoute}>
              <label htmlFor="origin">Origin</label>
              <div className="field-row">
                <input id="origin" onChange={(event) => setOrigin(event.target.value)} value={origin} />
                <button className="secondary-action compact-icon" onClick={handleUseCurrentLocation} type="button" aria-label="Use current location">
                  <LocateFixed size={17} />
                </button>
              </div>
              <label htmlFor="destination">Destination</label>
              <input id="destination" onChange={(event) => setDestination(event.target.value)} value={destination} />
              <div className="route-field-grid">
                <label htmlFor="route-date">Travel date
                  <input id="route-date" onChange={(event) => setRouteDate(event.target.value)} type="date" value={routeDate} />
                </label>
                <label htmlFor="travelers">Travelers
                  <input id="travelers" min="1" onChange={(event) => setTravelers(event.target.value)} type="number" value={travelers} />
                </label>
                <label htmlFor="budget">Budget
                  <input id="budget" min="0" onChange={(event) => setBudget(Number(event.target.value))} type="number" value={budget} />
                </label>
              </div>
              <div className="mode-grid" role="group" aria-label="Travel mode">
                {routeModes.map(({ id, label, icon: Icon }) => (
                  <button aria-pressed={routeMode === id} className={routeMode === id ? 'mode is-active' : 'mode'} key={id} onClick={() => setRouteMode(id)} type="button">
                    <Icon size={18} />
                    {label}
                  </button>
                ))}
              </div>
              <label htmlFor="traffic">Congestion strategy</label>
              <select id="traffic" onChange={(event) => setTrafficProfile(event.target.value)} value={trafficProfile}>
                {Object.entries(trafficProfiles).map(([id, profile]) => (
                  <option key={id} value={id}>{profile.label}</option>
                ))}
              </select>
              <label htmlFor="food-stop">Food between travel</label>
              <select id="food-stop" onChange={(event) => setFoodStop(event.target.value)} value={foodStop}>
                {foodStopOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
              <button className="primary-action" type="submit">Calculate route <Compass size={18} /></button>
            </form>

            <motion.div className="map-panel glass-card" variants={fadeUp}>
              <div className="map-chrome">
                <div>
                  <span>Live eco route canvas</span>
                  <strong>{origin} to {destination}</strong>
                </div>
                <div className="map-meta">
                  <span>{mapReady ? 'OSM tiles live' : 'Fallback scenic canvas'}</span>
                  {userLocation && <span>Using your current origin</span>}
                </div>
              </div>
              <div className="map-stage">
                <div aria-label={`${origin} to ${destination} route map`} className={mapReady ? 'map-canvas is-live' : 'map-canvas'} ref={mapRef} role="img">
                  {!mapReady && (
                    <div className="fallback-route">
                      <MapPinned size={34} />
                      <strong>{origin}</strong>
                      <span />
                      <strong>{destination}</strong>
                      {userLocation && <em>From your device location: {userLocation.lat}, {userLocation.lng}</em>}
                      <p>Free OpenStreetMap canvas. OSRM draws the route after calculation.</p>
                    </div>
                  )}
                </div>
                <div className="map-summary-badge">
                  <span>Green route</span>
                  <strong>{formatKg(routeGreenKg)} kg CO2e</strong>
                  <p>{formatKg(routeSaving)} kg lower than solo car travel.</p>
                </div>
              </div>
              <div className="route-stats">
                <div><span>Distance</span><strong>{formatKg(routeKm)} km</strong><small>{routeSource}</small></div>
                <div><span>Car baseline</span><strong>{formatKg(routeCarKg)} kg</strong><small>CO2e</small></div>
                <div><span>Green route</span><strong>{formatKg(routeGreenKg)} kg</strong><small>{formatKg(routeSaving)} kg saved</small></div>
              </div>
              <div className="route-intel">
                <div>
                  <DollarSign size={18} />
                  <strong>Cost estimate: ₹{routeCost.toLocaleString('en-IN')}</strong>
                  <span>{budgetDelta >= 0 ? `₹${budgetDelta.toLocaleString('en-IN')} under budget` : `₹${Math.abs(budgetDelta).toLocaleString('en-IN')} over budget`}</span>
                </div>
                <div>
                  <Route size={18} />
                  <strong>{congestion.label}</strong>
                  <span>{congestion.note}</span>
                </div>
                <div>
                  <Utensils size={18} />
                  <strong>{selectedFoodStop.label}</strong>
                  <span>{selectedFoodStop.examples} · {formatKg(selectedFoodStop.kg)} kg CO2e</span>
                </div>
              </div>
              <div className="window-row">
                {healthyWindows.map((window) => <span key={window}>{window}</span>)}
              </div>
            </motion.div>
          </motion.div>
        </section>

        <section id="diet" className="diet-section scenic-section">
          <video aria-hidden="true" className="section-video" src="/assets/vid7.mp4" autoPlay muted loop playsInline />
          <img className="section-backdrop is-right is-soft" src="/assets/imag11.jpeg" alt="" aria-hidden="true" />
          <motion.div className="section-heading reveal" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }}>
            <p className="eyebrow">Live food images</p>
            <h2>Your foods, turned into visual carbon cards.</h2>
            <p>Type meals, snacks, or receipt items. CarbonLens estimates impact, pulls matching food images, and suggests a lower-carbon move.</p>
          </motion.div>
          <motion.div className="food-tracker-intro glass-card" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }}>
            <aside className="food-tracker-sidebar" aria-label="Food tracker sections">
              <span>Food tracker</span>
              <button onClick={() => scrollTo('diet')} type="button"><ListChecks size={17} /> Log meals</button>
              <button onClick={() => scrollTo('dashboard')} type="button"><Database size={17} /> Open report</button>
              <button onClick={() => setFoodText(dailyDietEntries.map((meal) => meal.name).join(', '))} type="button"><Utensils size={17} /> Preview cards</button>
            </aside>
            <div className="food-intro-main">
              <div>
                <p className="eyebrow">Local food database</p>
                <h3>Track individual meals, then read the daily report.</h3>
                <p>Use the visual food search for quick item cards, then log breakfast, lunch, dinner, and snacks into the database. The dashboard graph aggregates those logs by real date.</p>
              </div>
              <div className="food-db-stats">
                <div><span>Stored days</span><strong>{dailyFoodSeries.length}</strong></div>
                <div><span>Meal records</span><strong>{mealCount}</strong></div>
                <div><span>Tracked total</span><strong>{formatKg(foodDatabaseTotal)} kg</strong></div>
              </div>
            </div>
          </motion.div>
          <motion.form className="food-search-panel glass-card" onSubmit={handleFoodTextSubmit} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }}>
            <label htmlFor="food-text">Foods to visualize</label>
            <div className="field-row">
              <input id="food-text" onChange={(event) => setFoodText(event.target.value)} placeholder="Try: 2 samosas, 500g paneer, coffee and dosa" value={foodText} />
              <button className="primary-action compact" type="submit">Show food impact <ArrowRight size={17} /></button>
            </div>
            <div className="food-token-row">
              {foodPromptTokens.map((token) => <span key={token}>{token}</span>)}
            </div>
          </motion.form>
          {visibleDietCards.length > 0 ? (
            <motion.div className="diet-grid reveal" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
              {visibleDietCards.map((card) => (
                <motion.article className="diet-card" key={card.name} variants={fadeUp} whileHover={{ y: -6, scale: 1.015 }}>
                  <img src={card.image} alt={card.name} loading="lazy" decoding="async" onError={(event) => { event.currentTarget.src = '/assets/imag5.jpeg' }} />
                  <div>
                    <div className="food-card-meta">
                      <span>{card.category || 'food'}</span>
                      <b>{formatKg(card.kg || card.saving)} kg</b>
                    </div>
                    <span>{card.kg ? `${formatKg(card.kg)} kg estimated impact` : `${formatKg(card.saving)} kg possible saving`}</span>
                    <h3>{card.name}</h3>
                    <p>{card.swap}</p>
                    <div className="food-meter"><i style={{ width: `${Math.min(100, Math.round(((card.kg || card.saving) / 4) * 100))}%` }} /></div>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          ) : (
            <motion.div className="diet-empty glass-card" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
              <Utensils size={22} />
              <strong>Type your real foods above.</strong>
              <p>CarbonLens will fetch matching food images from the web and build cards only from your input.</p>
            </motion.div>
          )}
          <motion.div className="daily-diet-panel glass-card" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }}>
            <form className="daily-diet-form" onSubmit={applyDailyDiet}>
              <div>
                <p className="eyebrow">Daily diet</p>
                <h3>Build today’s meal footprint</h3>
                <p>Fast enough for morning planning, precise enough to show which meal moves the day.</p>
              </div>
              <label htmlFor="diet-breakfast">Breakfast
                <input id="diet-breakfast" onChange={(event) => setDietPlan((current) => ({ ...current, breakfast: event.target.value }))} placeholder="oats, fruit, eggs, dosa..." value={dietPlan.breakfast} />
              </label>
              <label htmlFor="diet-lunch">Lunch
                <input id="diet-lunch" onChange={(event) => setDietPlan((current) => ({ ...current, lunch: event.target.value }))} placeholder="rice and dal, paneer wrap, biryani..." value={dietPlan.lunch} />
              </label>
              <label htmlFor="diet-dinner">Dinner
                <input id="diet-dinner" onChange={(event) => setDietPlan((current) => ({ ...current, dinner: event.target.value }))} placeholder="chana bowl, fish curry, noodles..." value={dietPlan.dinner} />
              </label>
              <label htmlFor="diet-snack">Snack
                <input id="diet-snack" onChange={(event) => setDietPlan((current) => ({ ...current, snack: event.target.value }))} placeholder="tea, coffee, fruit, samosa..." value={dietPlan.snack} />
              </label>
              <label htmlFor="diet-servings">Servings
                <input id="diet-servings" min="1" onChange={(event) => setDietPlan((current) => ({ ...current, servings: event.target.value }))} type="number" value={dietPlan.servings} />
              </label>
              <label htmlFor="diet-preference">Preference
                <input id="diet-preference" onChange={(event) => setDietPlan((current) => ({ ...current, preference: event.target.value }))} placeholder="vegetarian, high protein, budget..." value={dietPlan.preference} />
              </label>
              <button className="primary-action" type="submit">Log diet impact <ArrowRight size={18} /></button>
            </form>
            <div className="diet-score">
              <span>Today’s meal impact</span>
              <strong>{formatKg(dailyDietKg)} kg</strong>
              <p>{dailyDietSwap}</p>
              <div className="meal-chips">
                {dailyDietEntries.length
                  ? dailyDietEntries.map((meal) => <span key={`${meal.label}-${meal.name}`}>{meal.label}: {meal.name}</span>)
                  : <span>Waiting for your meal inputs</span>}
              </div>
            </div>
          </motion.div>
        </section>

        <section className="comparison-section premium-section">
          <video aria-hidden="true" className="section-video" src="/assets/vid9.mp4" autoPlay muted loop playsInline />
          <img className="section-backdrop is-left is-soft" src="/assets/imag10.jpeg" alt="" aria-hidden="true" />
          <img className="section-backdrop is-right is-tight" src="/assets/category_icons.png" alt="" aria-hidden="true" />
          <motion.div className="comparison-hero" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }}>
            <div>
              <p className="eyebrow">Comparison engine</p>
              <h2>The number becomes a physical thing.</h2>
              <p>Every scan becomes an anchor, a ranked item list, and a next move with enough context to act on it now.</p>
            </div>
            <div className="physical-anchor-card">
              <AnchorIcon size={34} />
              <span>Physical anchor</span>
              <strong>{comparison.line}</strong>
              <p>{comparison.nudge}</p>
            </div>
          </motion.div>
          <div className="comparison-metric-row reveal">
            <div className="comparison-metric">
              <span>Largest item</span>
              <strong>{topImpactItem?.name || 'Waiting for a scan'}</strong>
              <p>{topImpactItem ? `${formatKg(topImpactItem.kg)} kg is carrying the result.` : 'Run a scan, route, or diet plan to populate this.'}</p>
            </div>
            <div className="comparison-metric">
              <span>Dominant category</span>
              <strong>{largestCategory?.name || 'food'}</strong>
              <p>{largestCategory ? `${formatKg(largestCategory.value)} kg in this pass.` : 'Categories will appear after the first result.'}</p>
            </div>
            <div className="comparison-metric">
              <span>Best next move</span>
              <strong>{comparison.nudge}</strong>
              <p>CarbonLens keeps the recommendation singular so it stays usable in the moment.</p>
            </div>
          </div>
          <motion.div className="comparison-grid reveal" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.18 }}>
            <motion.div className="breakdown-panel" variants={fadeUp} role="region" aria-label="Recognized impact items">
              <h3>Items recognized</h3>
              <div className="item-list">
                {impact.items.map((item) => (
                  <div className="item-row" key={`${item.name}-${item.kg}-${item.quantity}`}>
                    <div><strong>{item.name}</strong><span>{item.quantity} {item.unit} via {item.source}</span></div>
                    <b>{formatKg(item.kg)} kg</b>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div className="breakdown-panel" variants={fadeUp} role="region" aria-label="Category split chart">
              <h3>Category split</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={categoryRows} dataKey="value" innerRadius={62} outerRadius={92} paddingAngle={3}>
                    {categoryRows.map((entry) => <Cell fill={entry.fill} key={entry.name} />)}
                  </Pie>
                  <Tooltip formatter={(value) => `${formatKg(Number(value))} kg`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="legend-row">
                {categoryRows.map((row) => <span key={row.name}><i style={{ background: row.fill }} /> {row.name}</span>)}
              </div>
            </motion.div>
          </motion.div>
        </section>

        <section id="pulse" className="pulse-section">
          {sectionReady.pulse ? (
            <>
              <video aria-hidden="true" className="section-video" src="/assets/vid8.mp4" autoPlay muted loop playsInline />
              <img className="section-backdrop is-left is-soft" src="/assets/imag1.jpeg" alt="" aria-hidden="true" />
              <motion.div className="pulse-hero" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }}>
                <div>
                  <p className="eyebrow">Live sustainability pulse</p>
                  <h2>Latest context, pulled with purpose.</h2>
                  <p>The stream stays secondary to your footprint. It exists to reinforce the swap CarbonLens is already recommending, not distract from it.</p>
                </div>
                <div className="pulse-stat-card">
                  <Newspaper size={24} />
                  <span>Live articles</span>
                  <strong>{articles.length || 0}</strong>
                  <p>Fresh climate, carbon, and lifestyle context from the backend scraper.</p>
                </div>
              </motion.div>
              {articlesLoading ? (
                <SectionGhost variant="cards" />
              ) : (
                <motion.div className="article-grid reveal" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.18 }}>
                  {articles.map((article) => (
                    <motion.a aria-label={`Open article: ${article.title}`} className="article-card" href={article.url} key={article.title} rel="noreferrer" target="_blank" variants={fadeUp} whileHover={{ y: -5 }}>
                      <Newspaper size={22} />
                      <span>{article.source}</span>
                      <h3>{article.title}</h3>
                      <p>{article.description}</p>
                    </motion.a>
                  ))}
                </motion.div>
              )}
            </>
          ) : (
            <SectionGhost variant="cards" />
          )}
        </section>

        <section id="mirror" className="mirror-section">
          <video aria-hidden="true" className="section-video" src="/assets/vid4.mp4" autoPlay muted loop playsInline />
          <img className="section-backdrop is-left is-soft" src="/assets/imag12.jpeg" alt="" aria-hidden="true" />
          <div className="mirror-art reveal"><img src="/assets/weekly_mirror.png" alt="Weekly carbon mirror visual" loading="lazy" decoding="async" /></div>
          <div className="mirror-copy reveal">
            <p className="eyebrow">Weekly Carbon Mirror</p>
            <h2>No lecture. One swap.</h2>
            <div className="mirror-stats">
              <div><span>Daily average</span><strong>{formatKg(weeklyMirror.average)} kg</strong></div>
              <div><span>Personal best</span><strong>{weeklyMirror.best.label || weeklyMirror.best.date}: {formatKg(weeklyMirror.best.total)} kg</strong></div>
              <div><span>Largest lever</span><strong>{weeklyMirror.topCategory.category}</strong></div>
            </div>
            <p className="swap-line">{weeklyMirror.suggestion}</p>
          </div>
        </section>

        <section id="dashboard" className="dashboard-section premium-section">
          <video aria-hidden="true" className="section-video" src="/assets/vid5.mp4" autoPlay muted loop playsInline />
          <img className="section-backdrop is-right is-soft" src="/assets/loading_animation.png" alt="" aria-hidden="true" />
          {sectionReady.dashboard ? (
            <>
              <div className="section-heading reveal">
                <p className="eyebrow">Dashboard / individual report</p>
                <h2>Daily food impact cockpit.</h2>
                <p>Set a daily target, review your stored meal database, and see the true day-by-day CO2e report from individual food logs.</p>
              </div>

              <div className="dashboard-grid reveal">
            <div className="budget-panel wide">
              <div>
                <span>Daily target</span>
                <label htmlFor="carbon-budget">
                  <Target size={18} />
                  <input id="carbon-budget" min="0.5" onChange={(event) => setCarbonBudget(Number(event.target.value))} step="0.1" type="number" value={carbonBudget} />
                  kg
                </label>
              </div>
              <div><span>Latest food day</span><strong>{formatKg(latestFoodDay?.total || latestDay?.total || 0)} kg</strong></div>
              <div><span>Daily average</span><strong>{formatKg(weeklyAverage)} kg</strong></div>
              <div><span>Best day</span><strong>{bestDay.label || bestDay.date}: {formatKg(bestDay.total)} kg</strong></div>
              <div><span>Over target</span><strong>{overBudgetDays} days</strong></div>
              <div><span>Stored meals</span><strong>{mealCount}</strong></div>
              <p>{dashboardInsight} Food database total: {formatKg(foodDatabaseTotal)} kg CO2e across {dailyFoodSeries.length} tracked days. At this pace, your 30-day projection is {formatKg(monthProjection)} kg CO2e.</p>
            </div>
            <div className="food-report-panel wide">
              <div className="panel-title"><Database size={20} /><h3>Individual food report</h3></div>
              <div className="food-report-grid">
                <div><span>Last log</span><strong>{latestFoodLog ? formatShortDate(latestFoodLog.date) : 'No food logs yet'}</strong><p>{latestFoodLog?.preference || 'Preference appears after logging meals.'}</p></div>
                <div><span>Top meal</span><strong>{topTrackedMeal?.name || 'Waiting for meals'}</strong><p>{topTrackedMeal ? `${topTrackedMeal.label}: ${formatKg(topTrackedMeal.kg)} kg CO2e` : 'Use the daily diet form to create a report.'}</p></div>
                <div><span>Main lever</span><strong>{foodReportCategory.category}</strong><p>{formatKg(foodReportCategory.value)} kg across stored food days.</p></div>
              </div>
              <div className="meal-report-list">
                {(latestFoodLog?.meals || []).map((meal) => (
                  <div key={meal.id}>
                    <span>{meal.label}</span>
                    <strong>{meal.name}</strong>
                    <b>{formatKg(meal.kg)} kg</b>
                  </div>
                ))}
                {!latestFoodLog && <p>No individual meal records yet. Log today’s diet to generate the first report.</p>}
              </div>
            </div>
            <div className="reduction-plan-panel wide" role="region" aria-label="Personalized carbon reduction plan">
              <div className="panel-title chart-title-row">
                <div><Leaf size={20} /><h3>Personal 3-day reduction plan</h3></div>
                <span>{formatKg(reductionPlan.projectedWeekSavings)} kg potential weekly saving</span>
              </div>
              <div className="plan-hero-row">
                <div>
                  <span>{reductionPlan.challenge}</span>
                  <strong>{reductionPlan.headline}</strong>
                  <p>{reductionPlan.cityContext}</p>
                </div>
                <div>
                  <span>Target gap</span>
                  <strong>{formatKg(reductionPlan.dailyGap)} kg/day</strong>
                  <p>{reductionPlan.weeklyAverage ? `${formatKg(reductionPlan.weeklyAverage)} kg recent average vs ${formatKg(carbonBudget)} kg target.` : 'Log entries to compare against your own baseline.'}</p>
                </div>
              </div>
              <div className="plan-action-grid">
                {reductionPlan.actions.map((action) => (
                  <article key={action.label}>
                    <span>{action.label}</span>
                    <strong>{action.title}</strong>
                    <p>{action.detail}</p>
                  </article>
                ))}
              </div>
            </div>
            <div className="chart-panel wide dashboard-total-chart" role="region" aria-label="Seven day food CO2e chart">
              <div className="panel-title chart-title-row">
                <div><History size={20} /><h3>True daily food CO2e</h3></div>
                <span>{loggedChartDays} logged day{loggedChartDays === 1 ? '' : 's'} in a 7 day view</span>
              </div>
              <div className="chart-stat-strip">
                <div>
                  <span>Latest</span>
                  <strong>{latestChartDay ? `${formatKg(latestChartDay.total)} kg` : 'Waiting for data'}</strong>
                </div>
                <div>
                  <span>Target read</span>
                  <strong>{chartTargetStatus}</strong>
                </div>
                <div>
                  <span>Peak day</span>
                  <strong>{chartPeak ? `${chartPeak.label}: ${formatKg(chartPeak.total)} kg` : 'No data yet'}</strong>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartWindow} margin={{ top: 20, right: 20, bottom: 4, left: 0 }}>
                  <defs>
                    <linearGradient id="dailyBarFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#72f7c5" />
                      <stop offset="55%" stopColor="#0bd18a" />
                      <stop offset="100%" stopColor="#047857" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(216, 222, 215, 0.16)" vertical={false} />
                  <XAxis axisLine={false} dataKey="label" tick={{ fill: 'rgba(247, 255, 249, 0.72)', fontSize: 12, fontWeight: 700 }} tickLine={false} />
                  <YAxis axisLine={false} domain={[0, (dataMax) => Math.ceil(Math.max(dataMax, carbonBudget, 1) * 1.25)]} tick={{ fill: 'rgba(247, 255, 249, 0.62)', fontSize: 12 }} tickLine={false} width={38} />
                  <Tooltip content={<FoodTimelineTooltip />} cursor={{ fill: 'rgba(125, 255, 210, 0.08)' }} />
                  <ReferenceLine ifOverflow="extendDomain" y={carbonBudget} stroke="#ff3b6b" strokeDasharray="8 8" strokeWidth={2} label={{ value: 'target', position: 'right', fill: '#ff8fac', fontSize: 12, fontWeight: 800 }} />
                  <Bar background={{ fill: 'rgba(255, 255, 255, 0.06)', radius: [8, 8, 0, 0] }} barSize={42} dataKey="total" name="daily total" radius={[8, 8, 0, 0]}>
                    {chartWindow.map((entry) => (
                      <Cell fill={entry.hasLog ? 'url(#dailyBarFill)' : 'rgba(255, 255, 255, 0.1)'} key={entry.date} />
                    ))}
                  </Bar>
                  <Line activeDot={{ r: 6, stroke: '#f7fff9', strokeWidth: 2 }} connectNulls dataKey="movingAverage" dot={false} name="movingAverage" stroke="#b7f7d4" strokeDasharray="6 6" strokeWidth={3} type="monotone" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-panel category-chart-panel" role="region" aria-label="Food category CO2e breakdown chart">
              <div className="panel-title"><Globe2 size={20} /><h3>Category breakdown</h3></div>
              <div className="category-legend-pills">
                {foodReportCategories.map((entry) => (
                  <span key={entry.category} style={{ '--pill-color': entry.fill }}>
                    {entry.label}
                    <b>{formatKg(entry.value)} kg</b>
                  </span>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={foodReportCategories} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 4 }}>
                  <CartesianGrid horizontal={false} stroke="rgba(216, 222, 215, 0.14)" />
                  <XAxis domain={[0, (dataMax) => Math.max(1, Math.ceil(dataMax * 1.18))]} hide type="number" />
                  <YAxis axisLine={false} dataKey="label" tick={{ fill: 'rgba(247, 255, 249, 0.74)', fontSize: 12, fontWeight: 800 }} tickLine={false} type="category" width={86} />
                  <Tooltip contentStyle={{ background: '#07130f', border: '1px solid rgba(125, 255, 210, 0.24)', borderRadius: 8, color: '#fff' }} formatter={(value) => `${formatKg(Number(value))} kg`} labelStyle={{ color: '#9ff8d9', fontWeight: 800 }} />
                  <Bar barSize={30} dataKey="value" radius={[0, 8, 8, 0]}>
                    {foodReportCategories.map((entry) => (
                      <Cell fill={entry.fill} key={entry.category} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="privacy-panel wide" role="region" aria-label="Anonymous usage analytics chart">
              <div className="panel-title chart-title-row">
                <div><ShieldCheck size={20} /><h3>Anonymous previous-entry pulse</h3></div>
                <span>No personal data stored</span>
              </div>
              <div className="privacy-metric-grid">
                <div><Users size={18} /><span>Unique browsers</span><strong>{uniqueBrowserCount}</strong></div>
                <div><History size={18} /><span>Saved actions</span><strong>{privacyEntryCount}</strong></div>
                <div><Target size={18} /><span>Active days</span><strong>{activeUsageDays}</strong></div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={privacyTimeline} margin={{ top: 12, right: 18, bottom: 4, left: 0 }}>
                  <CartesianGrid stroke="rgba(216, 222, 215, 0.14)" vertical={false} />
                  <XAxis axisLine={false} dataKey="label" tick={{ fill: 'rgba(247, 255, 249, 0.72)', fontSize: 12, fontWeight: 700 }} tickLine={false} />
                  <YAxis axisLine={false} allowDecimals={false} tick={{ fill: 'rgba(247, 255, 249, 0.62)', fontSize: 12 }} tickLine={false} width={34} />
                  <Tooltip content={<UsageTimelineTooltip />} cursor={{ fill: 'rgba(125, 255, 210, 0.08)' }} />
                  <Bar barSize={36} dataKey="entries" fill="#59d9a4" name="saved actions" radius={[8, 8, 0, 0]} />
                  <Line activeDot={{ r: 5, stroke: '#f7fff9', strokeWidth: 2 }} dataKey="visits" dot={false} name="visits" stroke="#8bd7ff" strokeWidth={3} type="monotone" />
                </ComposedChart>
              </ResponsiveContainer>
              <p>This graph is built from previous saved entries and visits only. CarbonLens keeps a random browser ID, dates, event counts, and CO2e totals; it never stores names, typed meals, receipt text, barcode values, camera images, or route locations in usage analytics.</p>
              {impactProof && (
                <div className="proof-ledger" role="region" aria-label="Cairo ready impact proof">
                  <div>
                    <span>Optional Starknet proof</span>
                    <strong>Cairo-ready impact receipt</strong>
                    <p>Hash the result locally, then anchor only the proof ID, total grams, category fingerprint, and timestamp.</p>
                  </div>
                  <dl>
                    <div><dt>Proof ID</dt><dd>{impactProof.proof_felt.slice(0, 18)}...</dd></div>
                    <div><dt>Total</dt><dd>{impactProof.total_grams_co2e.toLocaleString('en-IN')} g CO2e</dd></div>
                    <div><dt>Fingerprint</dt><dd>{impactProof.category_fingerprint_felt.slice(0, 18)}...</dd></div>
                  </dl>
                </div>
              )}
            </div>
                <div className="insight-panel">
                  <div>
                    <span>Momentum</span>
                    <strong>{underTargetStreak ? `${underTargetStreak} days under target` : 'Target missed today'}</strong>
                    <p>The report compares stored food days against your own moving average, not a generic guilt number.</p>
                  </div>
                  <div className="insight-metrics">
                    <div><span>Category lever</span><strong>{foodReportCategory.category}</strong></div>
                    <div><span>Best day</span><strong>{formatKg(bestDay.total)} kg</strong></div>
                    <div><span>Projection</span><strong>{formatKg(monthProjection)} kg / 30d</strong></div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <SectionGhost variant="dashboard" />
          )}
        </section>

        <section className="final-cta">
          <video aria-hidden="true" src="/assets/vid10.mp4" autoPlay muted loop playsInline />
          <div>
            <p className="eyebrow">Demo ready</p>
            <h2>The judge moment is the comparison.</h2>
            <button className="primary-action" onClick={() => scrollTo('scan')} type="button">
              Run another scan <RefreshCw size={18} />
            </button>
          </div>
          <div className="audio-card">
            <Headphones size={22} />
            <strong>Crown of Black soundtrack</strong>
            <p>The site now plays the local `crown_of_black.mp3` loop from your asset bundle instead of the old generated pad.</p>
            <button aria-pressed={isMusicOn} className="secondary-action" onClick={isMusicOn ? stopAmbient : startAmbient} type="button">
              {isMusicOn ? <Pause size={16} /> : <Music2 size={16} />}
              {isMusicOn ? 'Pause music' : 'Play music'}
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
