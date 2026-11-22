import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const readSource = (path) => readFileSync(new URL(path, import.meta.url), "utf8")
const appContext = readSource("../src/store/AppContext.tsx")
const jobDiscovery = readSource("../src/pages/worker/JobDiscovery.tsx")
const demoJobs = readSource("../src/services/demoJobs.ts")

test("public job sync is independent from notifications and reports failures", () => {
  assert.match(appContext, /Promise\.allSettled\(\[\s*apiRequest<ApiJob\[]>\("\/api\/jobs"\)/)
  assert.match(appContext, /publicJobsResult\.status === "fulfilled"/)
  assert.match(appContext, /\.\.\.\(mappedJobs \? \{ jobs: mappedJobs \} : \{\}\)/)
})

test("find jobs count and empty state include employer listings", () => {
  assert.match(jobDiscovery, /const totalResults = filteredJobs\.length \+ marketplaceResults\.length/)
  assert.ok(jobDiscovery.includes("{totalResults}</strong> results"))
  assert.match(jobDiscovery, /totalResults === 0 &&/)
})

test("bundled listings allow dataset growth while rejecting incomplete data", () => {
  assert.match(demoJobs, /jobs\.length < EXPECTED_BUNDLED_DEMO_JOB_COUNT/)
  assert.doesNotMatch(demoJobs, /jobs\.length !== EXPECTED_BUNDLED_DEMO_JOB_COUNT/)
})
