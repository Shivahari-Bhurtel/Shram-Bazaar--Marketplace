import { useApp } from "./store/AppContext"
import Navbar from "./components/Navbar"
import Landing from "./pages/Landing"
import AuthPage from "./pages/AuthPage"
import WorkerDashboard from "./pages/worker/WorkerDashboard"
import WorkerProfile from "./pages/worker/WorkerProfile"
import JobDiscovery from "./pages/worker/JobDiscovery"
import JobDetail from "./pages/worker/JobDetail"
import MyApplications from "./pages/worker/MyApplications"
import SavedJobs from "./pages/worker/SavedJobs"
import ProviderDashboard from "./pages/provider/ProviderDashboard"
import ProviderProfile from "./pages/provider/ProviderProfile"
import CreateEditJob from "./pages/provider/CreateEditJob"
import MyJobs from "./pages/provider/MyJobs"
import ApplicantManagement from "./pages/provider/ApplicantManagement"
import Chat from "./pages/Chat"
import Settings from "./pages/Settings"
import KycVerification from "./pages/worker/KycVerification"
import { LanguageSwitch } from "./i18n/LanguageContext"
import WorkerSidebar from "./components/WorkerSidebar"
import VoiceAssistantPage from "./pages/worker/VoiceAssistantPage"

export default function App() {
  const { state } = useApp()
  const { currentPage, currentUser, currentJobId } = state
  const isLoggedIn = !!currentUser
  const isWorker = currentUser?.role === "worker"
  const isProvider = currentUser?.role === "provider"
  const isWorkerAIChat = isWorker && currentPage === "chat"
  const isWorkerVoiceAssistant = isWorker && currentPage === "voice-assistant"
  const workerTopSpacing =
    isWorker && !isWorkerAIChat && !isWorkerVoiceAssistant
      ? currentPage === "my-applications"
        ? "lg:pt-0"
        : "lg:pt-20"
      : ""
  const showWorkerSidebar =
    isWorker &&
    !isWorkerVoiceAssistant &&
    !isWorkerAIChat &&
    !["landing", "login", "worker-signup", "provider-signup"].includes(
      currentPage,
    )
  const isAuthPage = ["login", "worker-signup", "provider-signup"].includes(
    currentPage,
  )

  const publicPages = ["landing", "login", "worker-signup", "provider-signup"]
  const isPublicPage = publicPages.includes(currentPage)

  return (
    <div
      className={`min-h-screen bg-cream ${isWorker ? "worker-interface" : ""}`}
    >
      {!isLoggedIn && !isAuthPage && <LanguageSwitch />}
      {isWorker && !isWorkerVoiceAssistant && (isWorkerAIChat ? <LanguageSwitch /> : <div className="hidden lg:block"><LanguageSwitch /></div>)}
      {isWorker && !isWorkerVoiceAssistant && !isWorkerAIChat && (
        <div className="lg:hidden">
          <Navbar />
        </div>
      )}
      {isLoggedIn && !isWorker && <Navbar />}
      {!isLoggedIn && !isPublicPage && <Navbar />}
      {showWorkerSidebar && <WorkerSidebar />}
      <main
        key={currentPage}
        className={`page-enter ${showWorkerSidebar ? "lg:ml-56" : ""} ${workerTopSpacing}`}
      >
        {/* Public pages */}
        {currentPage === "landing" && !isLoggedIn && <Landing />}
        {currentPage === "login" && <AuthPage mode="login" />}
        {currentPage === "worker-signup" && <AuthPage mode="worker-signup" />}
        {currentPage === "provider-signup" && (
          <AuthPage mode="provider-signup" />
        )}

        {/* Worker pages */}
        {isWorker && currentPage === "worker-dashboard" && <WorkerDashboard />}
        {isWorker && currentPage === "worker-profile" && <WorkerProfile />}
        {isWorker && currentPage === "kyc-verification" && <KycVerification />}
        {currentPage === "job-discovery" && <JobDiscovery />}
        {(isWorker || isProvider) && currentPage === "job-detail" && (
          <JobDetail />
        )}
        {isWorker && currentPage === "my-applications" && <MyApplications />}
        {isWorker && currentPage === "saved-jobs" && <SavedJobs />}
        {(isWorker || isProvider) && currentPage === "chat" && <Chat />}
        {isWorker && currentPage === "voice-assistant" && (
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

        {/* Redirect: logged-in worker landing -> dashboard */}
        {isWorker && currentPage === "landing" && <WorkerDashboard />}
        {isProvider && currentPage === "landing" && <ProviderDashboard />}
      </main>
    </div>
  )
}
