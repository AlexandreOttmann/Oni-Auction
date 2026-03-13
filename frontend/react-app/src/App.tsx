import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useBootstrapAuth } from './hooks/useBootstrapAuth'

const HomePage              = lazy(() => import('./pages/HomePage'))
const LoginPage             = lazy(() => import('./pages/LoginPage'))
const AdminDashboard        = lazy(() => import('./pages/AdminDashboard'))
const LiveAuction           = lazy(() => import('./pages/LiveAuction'))
const BuyerDashboard        = lazy(() => import('./pages/BuyerDashboard'))
const SellerOverview        = lazy(() => import('./pages/SellerOverview'))
const AdminAuctionMonitor   = lazy(() => import('./pages/AdminAuctionMonitor'))
const AuctionBuilder        = lazy(() => import('./pages/AuctionBuilder'))

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'ADMIN') return <Navigate to="/" replace />
  return <>{children}</>
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireBuyer({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'ADMIN') return <Navigate to="/dashboard" replace />
  if (user.role === 'SELLER') return <Navigate to="/my-auctions" replace />
  return <>{children}</>
}

function RequireSeller({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'ADMIN') return <Navigate to="/dashboard" replace />
  if (user.role === 'BUYER') return <Navigate to="/my-bids" replace />
  return <>{children}</>
}

export default function App() {
  useBootstrapAuth()
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping)

  if (isBootstrapping) return <div className="min-h-screen bg-[#09090B]" />

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090B]" />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/dashboard"
          element={
            <RequireAdmin>
              <AdminDashboard />
            </RequireAdmin>
          }
        />

        <Route
          path="/dashboard/auctions/new"
          element={
            <RequireAdmin>
              <AuctionBuilder />
            </RequireAdmin>
          }
        />

        <Route
          path="/dashboard/auctions/:auction_id"
          element={
            <RequireAdmin>
              <AdminAuctionMonitor />
            </RequireAdmin>
          }
        />

        <Route
          path="/auction/:auctionId"
          element={
            <RequireAuth>
              <LiveAuction />
            </RequireAuth>
          }
        />

        <Route
          path="/my-bids"
          element={
            <RequireBuyer>
              <BuyerDashboard />
            </RequireBuyer>
          }
        />

        <Route
          path="/my-auctions"
          element={
            <RequireSeller>
              <SellerOverview />
            </RequireSeller>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
