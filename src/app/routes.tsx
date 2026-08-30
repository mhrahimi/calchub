import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/shell/AppLayout'

const HomePage = lazy(() => import('@/features/home/HomePage'))
const FavoritesPage = lazy(() => import('@/features/favorites/FavoritesPage'))
const HistoryPage = lazy(() => import('@/features/history/HistoryPage'))
const SavedPage = lazy(() => import('@/features/saved/SavedPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))
const CategoryPage = lazy(() => import('@/features/category/CategoryPage'))

const AmortizationPage = lazy(() => import('@/features/calculators/AmortizationPage'))
const MortgagePage = lazy(() => import('@/features/calculators/MortgagePage'))
const InvestmentPage = lazy(() => import('@/features/calculators/InvestmentPage'))
const CompoundInterestPage = lazy(() => import('@/features/calculators/CompoundInterestPage'))
const LoanPage = lazy(() => import('@/features/calculators/LoanPage'))
const InterestRatePage = lazy(() => import('@/features/calculators/InterestRatePage'))
const DtiPage = lazy(() => import('@/features/calculators/DtiPage'))
const SavingsGoalPage = lazy(() => import('@/features/calculators/SavingsGoalPage'))
const SalaryPage = lazy(() => import('@/features/calculators/SalaryPage'))
const IncomeTaxPage = lazy(() => import('@/features/calculators/IncomeTaxPage'))
const RetirementPage = lazy(() => import('@/features/calculators/RetirementPage'))
const InflationPage = lazy(() => import('@/features/calculators/InflationPage'))
const NumberBasePage = lazy(() => import('@/features/calculators/NumberBasePage'))
const FractionsPercentagePage = lazy(() => import('@/features/calculators/FractionsPercentagePage'))
const StandardDeviationPage = lazy(() => import('@/features/calculators/StandardDeviationPage'))
const RandomNumberPage = lazy(() => import('@/features/calculators/RandomNumberPage'))
const TrianglePage = lazy(() => import('@/features/calculators/TrianglePage'))
const TrigonometryPage = lazy(() => import('@/features/calculators/TrigonometryPage'))
const PValuePage = lazy(() => import('@/features/calculators/PValuePage'))
const GcfLcmPage = lazy(() => import('@/features/calculators/GcfLcmPage'))
const DatePage = lazy(() => import('@/features/calculators/DatePage'))
const ConversionPage = lazy(() => import('@/features/calculators/ConversionPage'))
const BlackScholesPage = lazy(() => import('@/features/calculators/BlackScholesPage'))
const BondsPage = lazy(() => import('@/features/calculators/BondsPage'))
const CapTablePage = lazy(() => import('@/features/calculators/CapTablePage'))
const CreWaterfallPage = lazy(() => import('@/features/calculators/CreWaterfallPage'))
const DcfLboPage = lazy(() => import('@/features/calculators/DcfLboPage'))

function PageLoader() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-10 motion-safe:animate-pulse space-y-6" aria-busy="true" aria-label="Loading page">
      <div className="h-8 bg-surface-light rounded-lg w-1/3" />
      <div className="h-4 bg-surface-lighter rounded w-2/3" />
      <div className="grid lg:grid-cols-2 gap-8 mt-8">
        <div className="h-96 bg-surface-lighter rounded-2xl" />
        <div className="h-96 bg-surface-lighter rounded-2xl" />
      </div>
    </div>
  )
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="favorites" element={<FavoritesPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="saved" element={<SavedPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="category/:slug" element={<CategoryPage />} />
          <Route path="calculators/amortization" element={<AmortizationPage />} />
          <Route path="calculators/mortgage" element={<MortgagePage />} />
          <Route path="calculators/investment" element={<InvestmentPage />} />
          <Route path="calculators/compound-interest" element={<CompoundInterestPage />} />
          <Route path="calculators/loan" element={<LoanPage />} />
          <Route path="calculators/interest-rate" element={<InterestRatePage />} />
          <Route path="calculators/dti" element={<DtiPage />} />
          <Route path="calculators/savings-goal" element={<SavingsGoalPage />} />
          <Route path="calculators/salary" element={<SalaryPage />} />
          <Route path="calculators/income-tax" element={<IncomeTaxPage />} />
          <Route path="calculators/retirement" element={<RetirementPage />} />
          <Route path="calculators/inflation" element={<InflationPage />} />
          <Route path="calculators/number-base" element={<NumberBasePage />} />
          <Route path="calculators/fractions-percentage" element={<FractionsPercentagePage />} />
          <Route path="calculators/standard-deviation" element={<StandardDeviationPage />} />
          <Route path="calculators/random-number" element={<RandomNumberPage />} />
          <Route path="calculators/triangle" element={<TrianglePage />} />
          <Route path="calculators/trigonometry" element={<TrigonometryPage />} />
          <Route path="calculators/p-value" element={<PValuePage />} />
          <Route path="calculators/gcf-lcm" element={<GcfLcmPage />} />
          <Route path="calculators/date" element={<DatePage />} />
          <Route path="calculators/conversion" element={<ConversionPage />} />
          <Route path="calculators/black-scholes" element={<BlackScholesPage />} />
          <Route path="calculators/bonds" element={<BondsPage />} />
          <Route path="calculators/cap-table" element={<CapTablePage />} />
          <Route path="calculators/cre-waterfall" element={<CreWaterfallPage />} />
          <Route path="calculators/dcf-lbo" element={<DcfLboPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
