const CATEGORY_ACTIONS = {
  food: {
    title: 'Food swap',
    action: 'Make the highest-impact meal plant-forward or reduce the dairy/meat portion once.',
    why: 'Food choices are frequent, visible, and easy to repeat without new infrastructure.',
    savingRate: 0.32,
  },
  transport: {
    title: 'Route swap',
    action: 'Move one short trip to transit, rail, bike, walk, or a lower-congestion window.',
    why: 'Distance and vehicle mode change the result quickly when the trip is concrete.',
    savingRate: 0.4,
  },
  energy: {
    title: 'Energy timing',
    action: 'Delay AC, batch appliance use, or start with fan-first cooling for one session.',
    why: 'Small appliance changes are repeatable and do not require purchase decisions.',
    savingRate: 0.25,
  },
  shopping: {
    title: 'Buy-later check',
    action: 'Delay one non-essential purchase for 24 hours and reuse what already exists.',
    why: 'Avoided purchases cut embedded carbon before it becomes a receipt line.',
    savingRate: 0.28,
  },
}

function roundedKg(value) {
  return Number(Math.max(0, value).toFixed(2))
}

function itemSaving(item) {
  if (!item) return 0
  const category = CATEGORY_ACTIONS[item.category] || CATEGORY_ACTIONS.shopping
  return roundedKg(item.kg * category.savingRate)
}

function averageHistory(history = []) {
  const rows = history.filter((row) => Number.isFinite(Number(row.total)))
  if (!rows.length) return 0
  return roundedKg(rows.reduce((sum, row) => sum + Number(row.total), 0) / rows.length)
}

function bestHistoryDay(history = []) {
  const rows = history.filter((row) => Number.isFinite(Number(row.total)))
  return rows.length ? rows.reduce((winner, row) => (row.total < winner.total ? row : winner), rows[0]) : null
}

export function buildReductionPlan({ impact, history = [], carbonBudget = 3, city = 'your city' }) {
  const items = [...(impact?.items || [])].sort((left, right) => right.kg - left.kg)
  const topItem = items[0] || { name: 'first logged item', category: 'food', kg: 0 }
  const categoryTotals = impact?.byCategory || {}
  const topCategory = Object.entries(categoryTotals)
    .map(([category, kg]) => ({ category, kg: Number(kg) || 0 }))
    .sort((left, right) => right.kg - left.kg)[0] || { category: 'food', kg: 0 }
  const categoryAction = CATEGORY_ACTIONS[topCategory.category] || CATEGORY_ACTIONS.food
  const weeklyAverage = averageHistory(history)
  const bestDay = bestHistoryDay(history)
  const dailyGap = roundedKg(Math.max(0, weeklyAverage - carbonBudget))
  const primarySaving = itemSaving(topItem)
  const categorySaving = roundedKg(topCategory.kg * categoryAction.savingRate)
  const projectedWeekSavings = roundedKg(Math.max(primarySaving, categorySaving, dailyGap) * 3)

  return {
    topItem,
    topCategory,
    dailyGap,
    weeklyAverage,
    projectedWeekSavings,
    challenge: `3-day ${categoryAction.title.toLowerCase()} challenge`,
    headline: `Reduce ${topItem.name} first, then repeat the best day pattern.`,
    cityContext: `${city} plan: one concrete swap, one repeatable habit, one tracked result.`,
    actions: [
      {
        label: 'Highest lever',
        title: `Tackle ${topItem.name}`,
        detail: `A smaller portion or lower-carbon substitute can save about ${primarySaving.toFixed(2)} kg CO2e.`,
      },
      {
        label: categoryAction.title,
        title: topCategory.category,
        detail: `${categoryAction.action} ${categoryAction.why}`,
      },
      {
        label: 'Track',
        title: bestDay ? `Repeat ${bestDay.label || bestDay.date || 'your best day'}` : 'Log three days',
        detail: bestDay
          ? `Your best pattern was ${roundedKg(bestDay.total).toFixed(2)} kg CO2e. Reuse that routine once this week.`
          : 'Log three real choices so CarbonLens can compare today against your own baseline.',
      },
    ],
  }
}
