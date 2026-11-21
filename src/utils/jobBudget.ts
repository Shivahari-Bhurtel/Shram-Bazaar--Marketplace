import type { Job } from "../types"

export function formatJobBudget(job: Pick<Job, "payment" | "paymentMax" | "budgetNegotiable" | "paymentType">) {
  if (job.budgetNegotiable) return "Open to offers"
  const amount = `NPR ${Number(job.payment || 0).toLocaleString()}`
  const range = job.paymentMax && job.paymentMax > (job.payment || 0)
    ? `${amount}–NPR ${job.paymentMax.toLocaleString()}`
    : amount
  return `${range}${job.paymentType === "fixed" ? " fixed" : ` / ${job.paymentType.replace("per-", "per ")}`}`
}
