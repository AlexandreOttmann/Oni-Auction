import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminSidebar } from '../components/dashboard/AdminSidebar'
import { BuilderStepIndicator } from '../components/builder/BuilderStepIndicator'
import { Step1AuctionSetup } from '../components/builder/Step1AuctionSetup'
import { Step2Lots } from '../components/builder/Step2Lots'
import { Step3Review } from '../components/builder/Step3Review'
import { useAuctionBuilderStore } from '../stores/auctionBuilderStore'

export default function AuctionBuilder() {
  const { step, setStep, validateStep1, validateStep2, title, lots } = useAuctionBuilderStore()
  const navigate = useNavigate()

  // Warn on unload if there's unsaved data
  useEffect(() => {
    const hasData = title.trim().length > 0 || lots.some((l) => l.title.trim().length > 0)
    if (!hasData) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [title, lots])

  const goNext = () => {
    if (step === 1) {
      if (validateStep1()) setStep(2)
    } else if (step === 2) {
      if (validateStep2()) setStep(3)
    }
  }

  const stepLabels = ['Auction Setup', 'Configure Lots', 'Review & Publish']

  return (
    <div className="flex h-screen overflow-hidden bg-[#09090B]">
      <AdminSidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-800 px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              ← Back
            </button>
            <h1 className="text-sm font-semibold text-zinc-100">New Auction</h1>
          </div>
          <BuilderStepIndicator current={step} onStep={setStep} />
        </header>

        {/* Content */}
        <div className="flex flex-1 overflow-y-auto">
          <div className="flex-1 px-8 py-6 max-w-2xl">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-zinc-50">{stepLabels[step - 1]}</h2>
              <p className="text-xs text-zinc-500 mt-1">Step {step} of 3</p>
            </div>

            {step === 1 && <Step1AuctionSetup />}
            {step === 2 && <Step2Lots />}
            {step === 3 && <Step3Review />}

            {step < 3 && (
              <div className="mt-6 flex gap-3">
                {step > 1 && (
                  <button
                    onClick={() => setStep((step - 1) as 1 | 2 | 3)}
                    className="rounded border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={goNext}
                  className="rounded bg-orange-500 px-5 py-2 text-sm font-semibold text-zinc-950 hover:bg-orange-400 transition-colors"
                >
                  Continue →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
