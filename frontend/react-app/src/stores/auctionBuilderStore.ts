import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface LotDraft {
  id:             string
  title:          string
  description:    string
  starting_price: string
  reserve_price:  string
  min_increment:  string
  price_step:     string
  round_duration: string
  price_floor:    string
  errors:         Partial<Record<string, string>>
}

function emptyLot(): LotDraft {
  return {
    id:             crypto.randomUUID(),
    title:          '',
    description:    '',
    starting_price: '',
    reserve_price:  '',
    min_increment:  '',
    price_step:     '',
    round_duration: '',
    price_floor:    '',
    errors:         {},
  }
}

interface AuctionBuilderStore {
  step:           1 | 2 | 3
  setStep:        (s: 1 | 2 | 3) => void
  title:          string
  description:    string
  auctionType:    'ENGLISH' | 'DUTCH' | null
  startsAtDate:   string
  startsAtTime:   string
  sellerId:       string
  step1Errors:    Record<string, string>
  lots:           LotDraft[]
  addLot:         () => void
  removeLot:      (id: string) => void
  updateLot:      (id: string, field: string, value: string) => void
  reorderLots:    (newOrder: LotDraft[]) => void
  submitStatus:   'idle' | 'loading' | 'error'
  submitError:    string | null
  submit:         (publishStatus: 'DRAFT' | 'SCHEDULED' | 'ACTIVE', navigate: (path: string) => void) => Promise<void>
  reset:          () => void
  setField:       (field: string, value: string) => void
  validateStep1:  () => boolean
  validateStep2:  () => boolean
}

const defaultState = {
  step:         1 as const,
  title:        '',
  description:  '',
  auctionType:  null as null,
  startsAtDate: '',
  startsAtTime: '',
  sellerId:     '',
  step1Errors:  {} as Record<string, string>,
  lots:         [emptyLot()],
  submitStatus: 'idle' as const,
  submitError:  null as null,
}

export const useAuctionBuilderStore = create<AuctionBuilderStore>()(
  persist(
    (set, get) => ({
      ...defaultState,

      setStep: (step) => set({ step }),

      setField: (field, value) => set({ [field]: value } as Partial<AuctionBuilderStore>),

      addLot: () => {
        const lots = get().lots
        if (lots.length >= 10) return
        set({ lots: [...lots, emptyLot()] })
      },

      removeLot: (id) => {
        const lots = get().lots
        if (lots.length <= 1) return
        set({ lots: lots.filter((l) => l.id !== id) })
      },

      updateLot: (id, field, value) =>
        set((state) => ({
          lots: state.lots.map((l) =>
            l.id === id
              ? { ...l, [field]: value, errors: { ...l.errors, [field]: undefined } }
              : l,
          ),
        })),

      reorderLots: (newOrder) => set({ lots: newOrder }),

      validateStep1: () => {
        const { title, auctionType, startsAtDate, startsAtTime, sellerId } = get()
        const errors: Record<string, string> = {}
        if (!title.trim()) errors.title = 'Title is required'
        if (!auctionType) errors.auctionType = 'Select an auction type'
        if (!startsAtDate) errors.startsAtDate = 'Start date is required'
        if (!startsAtTime) errors.startsAtTime = 'Start time is required'
        if (!sellerId) errors.sellerId = 'Select a seller'
        set({ step1Errors: errors })
        return Object.keys(errors).length === 0
      },

      validateStep2: () => {
        const { lots, auctionType } = get()
        let valid = true
        const updatedLots = lots.map((lot) => {
          const errors: Partial<Record<string, string>> = {}
          if (!lot.title.trim()) errors.title = 'Required'
          if (!lot.starting_price) errors.starting_price = 'Required'
          if (auctionType === 'ENGLISH' && !lot.min_increment) errors.min_increment = 'Required'
          if (auctionType === 'DUTCH') {
            if (!lot.price_step) errors.price_step = 'Required'
            if (!lot.round_duration) errors.round_duration = 'Required'
            if (!lot.price_floor) errors.price_floor = 'Required'
          }
          if (Object.keys(errors).length > 0) valid = false
          return { ...lot, errors }
        })
        set({ lots: updatedLots })
        return valid
      },

      submit: async (publishStatus, navigate) => {
        set({ submitStatus: 'loading', submitError: null })
        const { title, description, auctionType, startsAtDate, startsAtTime, sellerId, lots } = get()
        const startsAt = startsAtDate && startsAtTime ? `${startsAtDate}T${startsAtTime}:00Z` : null

        const payload = {
          title,
          description,
          auction_type: auctionType,
          starts_at:    startsAt,
          seller_id:    sellerId,
          status:       publishStatus,
          lots: lots.map((l) => ({
            title:          l.title,
            description:    l.description,
            starting_price: parseFloat(l.starting_price) || 0,
            reserve_price:  l.reserve_price ? parseFloat(l.reserve_price) : null,
            min_increment:  l.min_increment ? parseFloat(l.min_increment) : null,
            price_step:     l.price_step ? parseFloat(l.price_step) : null,
            round_duration: l.round_duration ? parseInt(l.round_duration) : null,
            price_floor:    l.price_floor ? parseFloat(l.price_floor) : null,
          })),
        }

        try {
          const res = await fetch('/api/auctions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
          })
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.detail || 'Failed to create auction')
          }
          set({ submitStatus: 'idle' })
          get().reset()
          navigate('/dashboard')
        } catch (e) {
          set({ submitStatus: 'error', submitError: e instanceof Error ? e.message : 'Unexpected error' })
        }
      },

      reset: () => set({ ...defaultState, lots: [emptyLot()] }),
    }),
    {
      name:    'oni-auction-builder',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
