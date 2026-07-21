import type { Plan_id } from "./types"

export interface Plan {
  id: Plan_id
  name: string
  months: number
  /** Total price charged for the whole term, in USD. */
  price: number
  /** Percentage saved vs. the monthly rate. */
  savings: number
  description: string
  highlight?: boolean
}

/** Base pay-as-you-go monthly rate used to derive term pricing. */
export const MONTHLY_RATE = 49

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "1 Month",
    months: 1,
    price: 49,
    savings: 0,
    description: "Pay as you go, cancel anytime.",
  },
  {
    id: "professional",
    name: "3 Months",
    months: 3,
    price: 132,
    savings: 10,
    description: "Save 10% with a quarterly term.",
    highlight: true,
  },
  {
    id: "enterprise",
    name: "12 Months",
    months: 12,
    price: 470,
    savings: 20,
    description: "Best value — save 20% annually.",
  },
]

export const PLAN_MAP: Record<Plan_id, Plan> = PLANS.reduce(
  (acc, plan) => {
    acc[plan.id] = plan
    return acc
  },
  {} as Record<Plan_id, Plan>,
)

export function isValidPlanId(value: unknown): value is Plan_id {
  return typeof value === "string" && value in PLAN_MAP
}

export function perMonth(plan: Plan): number {
  return Math.round((plan.price / plan.months) * 100) / 100
}
