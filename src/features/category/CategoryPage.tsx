import { useNavigate } from 'react-router-dom'
import { getByCategory, getCategory } from '@/calculators/registry'
import { CalculatorCard } from '@/components/ui/CalculatorCard'
import { useApp } from '@/app/providers'
import { useParams } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { favorites, toggleFavorite } = useApp()

  const category = slug ? getCategory(slug) : undefined
  const calculators = slug ? getByCategory(slug) : []

  if (!category) {
    return (
      <EmptyState
        icon={<span className="text-lg">?</span>}
        title="Unknown category"
        description="That category isn’t in CalcHub."
        action={<Button onClick={() => navigate('/')}>Go home</Button>}
      />
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12">
      <h1 className="text-2xl font-bold text-text-primary">{category.title}</h1>
      <p className="text-text-secondary mt-1 mb-8">{category.description}</p>

      {calculators.length === 0 ? (
        <EmptyState
          icon={<span className="text-lg">+</span>}
          title="No calculators in this category yet"
          description={`${category.title} doesn’t have any tools yet.`}
          action={<Button onClick={() => navigate('/')}>See what’s available</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {calculators.map((calc) => (
            <CalculatorCard
              key={calc.id}
              calculator={calc}
              isFavorite={favorites.includes(calc.id)}
              onFavoriteToggle={toggleFavorite}
              onClick={() => navigate(calc.route)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
