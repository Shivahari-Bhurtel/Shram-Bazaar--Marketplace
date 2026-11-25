import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const readSource = (path) => readFileSync(new URL(path, import.meta.url), "utf8")
const dashboard = readSource("../src/pages/worker/WorkerDashboard.tsx")
const providerDashboard = readSource("../src/pages/provider/ProviderDashboard.tsx")
const demoJobs = readSource("../src/services/demoJobs.ts")
const himalayas = readSource("../src/services/himalayas.ts")
const jsearch = readSource("../src/services/jsearch.ts")

test("worker dashboard hides the removed label and search-results heading", () => {
  assert.doesNotMatch(dashboard, /Worker home|Remote IT job matches/)
})

test("dashboard search queries both live IT feeds and renders available rows", () => {
  assert.match(dashboard, /searchHimalayasJobs\(\{ q: submittedSearch/)
  assert.match(dashboard, /searchRemoteItJobs\(submittedSearch/)
  assert.match(dashboard, /Promise\.allSettled\(\[/)
  assert.match(dashboard, /job\.externalSource === "himalayas" \|\| job\.externalSource === "jsearch"/)
  assert.match(jsearch, /requestRemoteItPage\(`remote \$\{query\.trim\(\)\}`/)
  assert.match(himalayas, /export function isItOpportunity\(job: Job\)/)
})

test("worker demo listings always use the complete bundled JSON dataset", () => {
  assert.match(demoJobs, /EXPECTED_BUNDLED_DEMO_JOB_COUNT = 130/)
  assert.match(demoJobs, /return getBundledDemoJobs\(\)/)
  assert.doesNotMatch(demoJobs, /api\/jobs\/showcase/)
})

test("provider analytics use the signed-in provider's live jobs and applications", () => {
  assert.doesNotMatch(providerDashboard, /provider-analytics-demo\.json|useShowcaseAnalytics/)
  assert.match(providerDashboard, /const analyticsRows = applicantRows/)
  assert.match(providerDashboard, /const analyticsJobs = myJobs/)
  assert.match(providerDashboard, /applicantRows\.filter\(\(\{ application \}\) => isHired\(application\)\)/)
  assert.match(providerDashboard, /jobRows\.filter\(\(\{ application \}\) => isHired\(application\)\)/)
  assert.match(providerDashboard, /const chartMonthly = applicantCount === 0/)
  assert.match(providerDashboard, /Illustrative demo bars · no applications yet/)
})
