import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const readSource = (path) => readFileSync(new URL(path, import.meta.url), "utf8")

const authPage = readSource("../src/pages/AuthPage.tsx")
const app = readSource("../src/App.tsx")
const appContext = readSource("../src/store/AppContext.tsx")
const navbar = readSource("../src/components/Navbar.tsx")
const validation = readSource("../src/utils/validation.ts")
const authService = readSource("../shrambazar/src/main/java/com/shrambazar/service/auth/AuthService.java")
const localLauncher = readSource("../run-local.sh")
const backendApi = readSource("../src/services/backendApi.ts")
const styles = readSource("../src/index.css")

test("login Register opens account type choices without route navigation", () => {
  assert.match(authPage, /onClick=\{\(\) => changeAuthMode\("register-choice"\)\}/)
  assert.match(authPage, /setMode\(nextMode\)/)
})

test("email/password auth accepts general email domains without requiring Gmail", () => {
  assert.ok(validation.includes("return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email.trim())"))
  assert.doesNotMatch(validation, /gmail\.com|google\.com/i)
  assert.match(appContext, /JSON\.stringify\(\{ email: email\.trim\(\), password \}\)/)
  assert.match(authService, /findByEmailIgnoreCase/)
  assert.match(authService, /normalizeEmail\(request\.email\(\)\)/)
})

test("local login and registration can persist without Docker or PostgreSQL", () => {
  assert.match(localLauncher, /jdbc:h2:file:/)
  assert.match(localLauncher, /DB_DRIVER="org\.h2\.Driver"/)
  assert.match(localLauncher, /shrambazar\/\.local\/shrambazar/)
})

test("auth survives unavailable browser session storage for the current page session", () => {
  assert.match(backendApi, /let memoryAuth: BackendAuth \| null \| undefined/)
  assert.match(backendApi, /if \(memoryAuth !== undefined\) return memoryAuth/)
  assert.match(backendApi, /memoryAuth = auth/)
  assert.doesNotMatch(backendApi, /This browser could not store the sign-in session/)
})

test("signup validates the BCrypt UTF-8 password limit in both client and API", () => {
  const validation = readSource("../src/utils/validation.ts")
  assert.match(validation, /new TextEncoder\(\)\.encode\(password\)\.length <= 72/)
  assert.match(authPage, /isValidAuthPasswordLength\(formData\.password\)/)
  assert.match(appContext, /isValidAuthPasswordLength\(form\.password\)/)
  assert.match(authService, /password\.getBytes\(StandardCharsets\.UTF_8\)\.length > 72/)
})

test("password visibility controls stay vertically centered on hover and toggle accessibly", () => {
  assert.match(authPage, /password-visibility-button absolute right-2 top-1\/2/)
  assert.match(authPage, /aria-label=\{visible \? "Hide password" : "Show password"\}/)
  assert.match(styles, /\.password-visibility-button[\s\S]{0,250}translate: 0 -50%/)
})

test("account type choices open worker and provider signup", () => {
  assert.match(authPage, /changeAuthMode\("worker-signup"\)/)
  assert.match(authPage, /changeAuthMode\("provider-signup"\)/)
})

test("signup screens are rendered and protected from role redirects", () => {
  assert.match(app, /currentPage === "register-choice" && <AuthPage mode="register-choice" \/>/)
  assert.match(app, /currentPage === "worker-signup" && <AuthPage mode="worker-signup" \/>/)
  assert.match(app, /<AuthPage mode="provider-signup" \/>/)
  assert.match(appContext, /if \(authPages\.includes\(page\)\)/)
  assert.match(appContext, /!authPages\.includes\(currentPage\)/)
})

test("signed-in showcase users can open registration to create another account", () => {
  assert.equal((navbar.match(/navigate\("register-choice"\)/g) || []).length, 2)
  assert.match(navbar, /Create another account/)
})

test("signup does not request gender or street addresses", () => {
  assert.doesNotMatch(authPage, /Gender \(optional\)|Street, ward, or tole address|Local address|Business or organization address/)
  assert.doesNotMatch(appContext, /Enter your local address|Enter your street or local address/)
  assert.match(appContext, /address: form\.district\.trim\(\)/)
})

test("worker skills stay in a single typed field without suggestions or chips", () => {
  assert.match(authPage, /Type skills; press Enter to separate them/)
  assert.match(authPage, /setSkillInput\(\(value\) =>/)
  assert.doesNotMatch(authPage, /useSkillCatalog|filteredSkills|removeSkill|<datalist/)
})

test("worker signup step two omits the removed helper and back link", () => {
  assert.doesNotMatch(authPage, /Back to account details|Step 1 of 2 — Contact information|Step 2 of 2 — Business details/)
  assert.match(authPage, /isWorker && step === 2[\s\S]{0,180}Already have an account\?/)
})
