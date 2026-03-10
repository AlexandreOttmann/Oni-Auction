import { useState, type FC } from 'react'
import { motion } from 'motion/react'
import { AdminSidebar } from '../components/dashboard/AdminSidebar'
import { KpiStrip } from '../components/dashboard/KpiStrip'
import { AuctionFilterTabs } from '../components/dashboard/AuctionFilterTabs'
import { AuctionList } from '../components/dashboard/AuctionList'
import { NewAuctionModal } from '../components/dashboard/NewAuctionModal'
import { useDashboardStore } from '../stores/dashboardStore'
import { useAuctionList } from '../hooks/useAuctionList'

type Filter = 'all' | 'ACTIVE' | 'CLOSING' | 'SCHEDULED' | 'CLOSED'

const AdminDashboard: FC = () => {
  const { setShowNewAuctionModal } = useDashboardStore()
  const [filter, setFilter] = useState<Filter>('all')
  const { data: auctions = [], isLoading } = useAuctionList()

  const filteredAuctions = filter === 'all'
    ? auctions
    : auctions.filter((a) => a.status === filter)

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="flex h-screen bg-[#09090B] overflow-hidden">
      <AdminSidebar />

      {/* Main content */}
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto p-8">
        {/* Header */}
        <motion.div
          className="mb-8 flex items-start justify-between"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.25 }}
        >
          <div>
            <h1 className="text-2xl font-bold text-zinc-50">Auction Dashboard</h1>
            <p className="mt-0.5 text-sm text-zinc-600">{today}</p>
          </div>
          <motion.button
            onClick={() => setShowNewAuctionModal(true)}
            className="flex h-[38px] items-center gap-2 rounded-lg bg-orange-500 px-5 text-sm font-semibold text-[#09090B] hover:bg-orange-400 transition-colors"
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <span>+</span>
            <span>New Auction</span>
          </motion.button>
        </motion.div>

        {/* KPIs */}
        <div className="mb-6">
          <KpiStrip auctions={auctions} />
        </div>

        {/* Filter tabs */}
        <motion.div
          className="mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.44 }}
        >
          <AuctionFilterTabs
            activeFilter={filter}
            onFilter={setFilter}
            auctions={auctions}
          />
        </motion.div>

        {/* Auction list */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <AuctionList auctions={filteredAuctions} isLoading={isLoading} />
        </motion.div>
      </main>

      <NewAuctionModal />
    </div>
  )
}

export default AdminDashboard
