import { Leaf } from 'lucide-react'

export function ReductionPlanPanel({ carbonBudget, formatKg, reductionPlan }) {
  return (
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
  )
}
