import { lazy, Suspense } from "react"
import { useApp } from "./store/AppContext"
import Navbar from "./components/Navbar"
const Landing = lazy(() => import("./pages/Landing"))
const AuthPage = lazy(() => import("./pages/AuthPage"))
const WorkerDashboard = lazy(() => import("./pages/worker/WorkerDashboard"))
const WorkerProfile = lazy(() => import("./pages/worker/WorkerProfile"))
const JobDiscovery = lazy(() => import("./pages/worker/JobDiscovery"))
const JobDetail = lazy(() => import("./pages/worker/JobDetail"))
const MyApplications = lazy(() => import("./pages/worker/MyApplications"))
const SavedJobs = lazy(() => import("./pages/worker/SavedJobs"))
const ProviderDashboard = lazy(
  () => import("./pages/provider/ProviderDashboard"),
)
const ProviderProfile = lazy(() => import("./pages/provider/ProviderProfile"))
const CreateEditJob = lazy(() => import("./pages/provider/CreateEditJob"))
const MyJobs = lazy(() => import("./pages/provider/MyJobs"))
const ApplicantManagement = lazy(
  () => import("./pages/provider/ApplicantManagement"),
)
const ProviderOperations = lazy(
  () => import("./pages/provider/ProviderOperations"),
)
const Chat = lazy(() => import("./pages/Chat"))
const Settings = lazy(() => import("./pages/Settings"))
const KycVerification = lazy(() => import("./pages/worker/KycVerification"))
import { LanguageSwitch } from "./i18n/LanguageContext"
import WorkerSidebar from "./components/WorkerSidebar"
const VoiceAssistantPage = lazy(
  () => import("./pages/worker/VoiceAssistantPage"),
)
const Learn = lazy(() => import("./pages/worker/Learn"))
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"))
const AIWorkspace = lazy(() => import("./pages/AIWorkspace"))

export default function App() {
  const { state } = useApp()
  const { currentPage, currentUser, currentJobId } = state
  const isLoggedIn = !!currentUser
  const isWorker = currentUser?.role === "worker"
  const isProvider = currentUser?.role === "provider"
  const isAdmin = currentUser?.role === "admin"
  const isWorkerAIChat = isWorker && currentPage === "chat"
  const isFullScreenJobDiscovery = isWorker && currentPage === "job-discovery"
  const isVoiceAssistant =
    (isWorker || isProvider) && currentPage === "voice-assistant"
  const useWorkerPageBackground =
    isWorker && !isWorkerAIChat && !isVoiceAssistant && !isFullScreenJobDiscovery && currentPage !== "shram-ai"
  const workerTopSpacing =
    isWorker && !isWorkerAIChat && !isVoiceAssistant && !isFullScreenJobDiscovery
      ? currentPage === "my-applications"
        ? "lg:pt-0"
        : currentPage === "shram-ai"
          ? "lg:pt-14"
          : "lg:pt-20"
      : ""
  const showWorkerSidebar =
    isWorker &&
    !isVoiceAssistant &&
    !isWorkerAIChat &&
    !isFullScreenJobDiscovery &&
    !["landing", "login", "worker-signup", "provider-signup"].includes(
      currentPage,
    )
  const isAuthPage = ["login", "register-choice", "worker-signup", "provider-signup"].includes(
    currentPage,
  )

  const publicPages = ["landing", "login", "register-choice", "worker-signup", "provider-signup"]
  const isPublicPage = publicPages.includes(currentPage)

  return (
    <div
      className={`min-h-screen bg-cream ${isWorker ? "worker-interface" : ""} ${useWorkerPageBackground ? "worker-content-background" : ""}`}
    >
      {state.storageWarning && (
        <div
          role="alert"
          className="fixed bottom-4 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-lg"
        >
          {state.storageWarning}
        </div>
      )}
      {!isLoggedIn && !isAuthPage && !isFullScreenJobDiscovery && <LanguageSwitch />}
      {isWorker && !isVoiceAssistant &&
        (isFullScreenJobDiscovery ? (
          <LanguageSwitch />
        ) : isWorkerAIChat ? (
          <LanguageSwitch />
        ) : (
          <div className="hidden lg:block">
            <LanguageSwitch />
          </div>
        ))}
      {isWorker && !isVoiceAssistant && !isWorkerAIChat && !isFullScreenJobDiscovery && (
        <div className="lg:hidden">
          <Navbar />
        </div>
      )}
      {isLoggedIn && !isWorker && !isAdmin && !isVoiceAssistant && <Navbar />}
      {!isLoggedIn && !isPublicPage && <Navbar />}
      {showWorkerSidebar && <WorkerSidebar />}
      <main
        key={currentPage}
        className={`${isFullScreenJobDiscovery ? "h-[100dvh] w-full overflow-hidden" : "page-enter"} ${
          showWorkerSidebar ? "lg:ml-56" : ""
        } ${workerTopSpacing}`}
      >
        <Suspense
          fallback={
            <div className="flex min-h-[50vh] items-center justify-center text-sm font-medium text-stone-500">
              Loading page…
            </div>
          }
        >
          {/* Public pages */}
          {currentPage === "landing" && !isLoggedIn && <Landing />}
          {currentPage === "login" && <AuthPage mode="login" />}
          {currentPage === "register-choice" && <AuthPage mode="register-choice" />}
          {currentPage === "worker-signup" && <AuthPage mode="worker-signup" />}
          {currentPage === "provider-signup" && (
            <AuthPage mode="provider-signup" />
          )}

          {/* Worker pages */}
          {isWorker && currentPage === "worker-dashboard" && (
            <WorkerDashboard />
          )}
          {isWorker && currentPage === "worker-profile" && <WorkerProfile />}
          {isWorker && currentPage === "kyc-verification" && (
            <KycVerification />
          )}
          {currentPage === "job-discovery" && <JobDiscovery />}
          {(isWorker || isProvider) && currentPage === "job-detail" && (
            <JobDetail />
          )}
          {isWorker && currentPage === "my-applications" && <MyApplications />}
          {isWorker && currentPage === "saved-jobs" && <SavedJobs />}
          {isWorker && currentPage === "learn" && <Learn />}
          {(isWorker || isProvider) && currentPage === "shram-ai" && (
            <AIWorkspace />
          )}
          {(isWorker || isProvider) && currentPage === "chat" && <Chat />}
          {(isWorker || isProvider) && currentPage === "voice-assistant" && (
            <VoiceAssistantPage />
          )}
          {isLoggedIn && currentPage === "settings" && <Settings />}

          {/* Provider pages */}
          {isProvider && currentPage === "provider-dashboard" && (
            <ProviderDashboard />
          )}
          {isProvider && currentPage === "provider-profile" && (
            <ProviderProfile />
          )}
          {isProvider && currentPage === "provider-operations" && (
            <ProviderOperations />
          )}
          {isProvider && currentPage === "create-job" && (
            <CreateEditJob editJobId={null} />
          )}
          {isProvider && currentPage === "edit-job" && (
            <CreateEditJob editJobId={currentJobId} />
          )}
          {isProvider && currentPage === "my-jobs" && <MyJobs />}
          {isProvider && currentPage === "applicant-management" && (
            <ApplicantManagement />
          )}
          {isAdmin && currentPage === "admin-dashboard" && <AdminDashboard />}

          {/* Redirect: logged-in worker landing -> dashboard */}
          {isWorker && currentPage === "landing" && <WorkerDashboard />}
          {isProvider && currentPage === "landing" && <ProviderDashboard />}
        </Suspense>
      </main>
    </div>
  )
}
