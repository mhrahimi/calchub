import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SearchBar } from '@/components/search/SearchBar'
import { CalculatorCard } from '@/components/ui/CalculatorCard'
import {
  CATEGORIES,
  getPopularCalculators,
  RECOMMENDED_IDS,
  getCalculatorById,
} from '@/calculators/registry'
import { useApp } from '@/app/providers'
import { getRecentlyUsed } from '@/persistence/recentlyUsed'
import { cn } from '@/utils/cn'

export default function HomePage() {
  const navigate = useNavigate()
  const { favorites, toggleFavorite } = useApp()
  const recentIds = getRecentlyUsed()

  const quickAccess =
    favorites.length > 0
      ? favorites.map((id) => getCalculatorById(id)).filter(Boolean)
      : RECOMMENDED_IDS.map((id) => getCalculatorById(id)).filter(
          (c) => c?.implemented,
        )

  const recentCalcs = recentIds
    .map((id) => getCalculatorById(id))
    .filter((c) => c?.implemented)

  const popular = getPopularCalculators()

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12 space-y-12">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      >
        <h1 className="text-3xl lg:text-4xl font-bold text-text-primary hidden lg:block">
          CalcHub
        </h1>
        <p className="text-text-secondary mt-1 mb-6 lg:text-lg">
          Every calculation. One place.
        </p>
        <SearchBar className="max-w-xl" />
      </motion.section>

      <Section title="Quick Access">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickAccess.map(
            (calc) =>
              calc && (
                <CalculatorCard
                  key={calc.id}
                  calculator={calc}
                  isFavorite={favorites.includes(calc.id)}
                  onFavoriteToggle={toggleFavorite}
                  onClick={() => navigate(calc.route)}
                />
              ),
          )}
        </div>
      </Section>

      {recentCalcs.length > 0 && (
        <Section title="Recently Used">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentCalcs.map(
              (calc) =>
                calc && (
                  <CalculatorCard
                    key={calc.id}
                    calculator={calc}
                    isFavorite={favorites.includes(calc.id)}
                    onFavoriteToggle={toggleFavorite}
                    onClick={() => navigate(calc.route)}
                  />
                ),
            )}
          </div>
        </Section>
      )}

      <Section title="Categories">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
          {CATEGORIES.map((cat, i) => (
            <button
              key={cat.slug}
              onClick={() => navigate(`/category/${cat.slug}`)}
              className={cn(
                'text-left rounded-[16px] border border-border bg-background-secondary/50 p-1',
                'transition-all duration-300 hover:border-primary hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)]',
                i === 0 && 'lg:row-span-2',
              )}
            >
              <div className="rounded-[14px] bg-white border border-white/80 p-6 h-full flex flex-col justify-center">
                <h3 className="font-semibold text-text-primary text-lg">{cat.title}</h3>
                <p className="text-sm text-text-secondary mt-2">{cat.description}</p>
              </div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Popular Calculators">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {popular.map((calc) => (
            <CalculatorCard
              key={calc.id}
              calculator={calc}
              isFavorite={favorites.includes(calc.id)}
              onFavoriteToggle={toggleFavorite}
              onClick={() => navigate(calc.route)}
            />
          ))}
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
    >
      <h2 className="text-xs uppercase tracking-widest text-text-muted mb-4">{title}</h2>
      {children}
    </motion.section>
  )
}
