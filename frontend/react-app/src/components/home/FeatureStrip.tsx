import type { FC } from 'react'
import { motion } from 'motion/react'

const features = [
  {
    icon: '↑',
    iconColor: 'text-orange-500',
    title: 'Ascending Price',
    body: 'Buyers compete for the best deal. Real-time bid updates. Anti-snipe protection in the final 30 seconds.',
  },
  {
    icon: '↓',
    iconColor: 'text-violet-400',
    title: 'Descending Price',
    body: 'Price drops each round. First buyer to strike wins. Speed is the edge. No bidding war — just the right moment.',
  },
  {
    icon: '◎',
    iconColor: 'text-green-400',
    title: 'Live Without Refresh',
    body: 'Kafka-backed event bus. WebSocket delivery to every client. Bid activity visible the instant it happens.',
  },
]

export const FeatureStrip: FC = () => {
  return (
    <section className="bg-[#FAFAF8] py-20">
      <div className="mx-auto max-w-[1100px] px-6">
        <motion.div
          className="grid grid-cols-1 gap-12 md:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              className="group cursor-default"
              variants={{
                hidden: { opacity: 0, y: 12 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0, 0, 0.2, 1] } },
              }}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            >
              <div className={`mb-4 text-3xl ${f.iconColor}`}>{f.icon}</div>
              <h3 className="mb-3 text-lg font-bold text-[#18181B]">{f.title}</h3>
              <p className="text-sm leading-relaxed text-[#71717A]">{f.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
