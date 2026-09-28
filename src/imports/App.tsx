import { AppProvider, useApp } from './store/AppContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import AuthPage from './pages/AuthPage';
import WorkerDashboard from './pages/worker/WorkerDashboard';
import WorkerProfile from './pages/worker/WorkerProfile';
import JobDiscovery from './pages/worker/JobDiscovery';
import JobDetail from './pages/worker/JobDetail';
import MyApplications from './pages/worker/MyApplications';
import SavedJobs from './pages/worker/SavedJobs';
import ProviderDashboard from './pages/provider/ProviderDashboard';
import ProviderProfile from './pages/provider/ProviderProfile';
import CreateEditJob from './pages/provider/CreateEditJob';
import MyJobs from './pages/provider/MyJobs';
import ApplicantManagement from './pages/provider/ApplicantManagement';

function AppRouter() {
  const { state } = useApp();
  const { currentPage, currentUser, currentJobId } = state;
  const isLoggedIn = !!currentUser;
  const isWorker = currentUser?.role === 'worker';
  const isProvider = currentUser?.role === 'provider';

  const publicPages = ['landing', 'login', 'worker-signup', 'provider-signup'];
  const isPublicPage = publicPages.includes(currentPage);

  return (
    <div className="min-h-screen bg-cream">
      {isLoggedIn && <Navbar />}
      {!isLoggedIn && !isPublicPage && <Navbar />}

      <main>
        {/* Public pages */}
        {currentPage === 'landing' && !isLoggedIn && <Landing />}
        {currentPage === 'login' && <AuthPage mode="login" />}
        {currentPage === 'worker-signup' && <AuthPage mode="worker-signup" />}
        {currentPage === 'provider-signup' && <AuthPage mode="provider-signup" />}

        {/* Worker pages */}
        {isWorker && currentPage === 'worker-dashboard' && <WorkerDashboard />}
        {isWorker && currentPage === 'worker-profile' && <WorkerProfile />}
        {isWorker && currentPage === 'job-discovery' && <JobDiscovery />}
        {(isWorker || isProvider) && currentPage === 'job-detail' && <JobDetail />}
        {isWorker && currentPage === 'my-applications' && <MyApplications />}
        {isWorker && currentPage === 'saved-jobs' && <SavedJobs />}

        {/* Provider pages */}
        {isProvider && currentPage === 'provider-dashboard' && <ProviderDashboard />}
        {isProvider && currentPage === 'provider-profile' && <ProviderProfile />}
        {isProvider && currentPage === 'create-job' && <CreateEditJob editJobId={null} />}
        {isProvider && currentPage === 'edit-job' && <CreateEditJob editJobId={currentJobId} />}
        {isProvider && currentPage === 'my-jobs' && <MyJobs />}
        {isProvider && currentPage === 'applicant-management' && <ApplicantManagement />}

        {/* Redirect: logged-in worker landing -> dashboard */}
        {isWorker && currentPage === 'landing' && <WorkerDashboard />}
        {isProvider && currentPage === 'landing' && <ProviderDashboard />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}
