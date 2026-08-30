import { useNavigate } from 'react-router-dom'
import { Star } from 'lucide-react'
import { CalculatorCard } from '@/components/ui/CalculatorCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { getCalculatorById } from '@/calculators/registry'
import { useApp } from '@/app/providers'
import { Button } from '@/components/ui/Button'

export default function FavoritesPage() {
  const navigate = useNavigate()
  const { favorites, toggleFavorite } = useApp()

  const calculators = favorites
    .map((id) => getCalculatorById(id))
    .filter((c) => c?.implemented)

  if (calculators.length === 0) {
    return (
      <EmptyState
        icon={<Star className="w-6 h-6" />}
        title="No favorites yet"
        description="Star a calculator from its page to pin it here."
        action={
          <Button onClick={() => navigate('/')}>Go to home</Button>
        }
      />
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Favorites</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {calculators.map(
          (calc) =>
            calc && (
              <CalculatorCard
                key={calc.id}
                calculator={calc}
                isFavorite
                onFavoriteToggle={toggleFavorite}
                onClick={() => navigate(calc.route)}
              />
            ),
        )}
      </div>
    </div>
  )
}
