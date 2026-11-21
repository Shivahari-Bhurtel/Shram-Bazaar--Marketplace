import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const readSource = (path) => readFileSync(new URL(path, import.meta.url), "utf8")

const authPage = readSource("../src/pages/AuthPage.tsx")
const app = readSource("../src/App.tsx")
const appContext = readSource("../src/store/AppContext.tsx")
const navbar = readSource("../src/components/Navbar.tsx")

test("login Register opens account type choices without route navigation", () => {
  assert.match(authPage, /onClick=\{\(\) => changeAuthMode\("register-choice"\)\}/)
  assert.match(authPage, /setMode\(nextMode\)/)
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
