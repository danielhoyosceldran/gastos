import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { LoginPage } from './pages/auth/LoginPage';
import { WaitingPage } from './pages/auth/WaitingPage';
import { AppLayout } from './components/Layout/AppLayout';
import { ToastContainer } from './components/Toast/ToastContainer';
import { PwaInstallBanner } from './components/PwaInstallBanner/PwaInstallBanner';

const DashboardPage      = lazy(() => import('./pages/Dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const AddExpensePage     = lazy(() => import('./pages/Expenses/AddExpensePage').then(m => ({ default: m.AddExpensePage })));
const BudgetsPage        = lazy(() => import('./pages/Budgets/BudgetsPage').then(m => ({ default: m.BudgetsPage })));
const AnalyticsPage      = lazy(() => import('./pages/Analytics/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const SettingsPage       = lazy(() => import('./pages/Settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const CategoriesPage     = lazy(() => import('./pages/Settings/Categories/CategoriesPage').then(m => ({ default: m.CategoriesPage })));
const TagsPage           = lazy(() => import('./pages/Settings/Tags/TagsPage').then(m => ({ default: m.TagsPage })));
const TagGroupsPage      = lazy(() => import('./pages/Settings/TagGroups/TagGroupsPage').then(m => ({ default: m.TagGroupsPage })));
const PaymentMethodsPage = lazy(() => import('./pages/Settings/PaymentMethods/PaymentMethodsPage').then(m => ({ default: m.PaymentMethodsPage })));
const EventsPage         = lazy(() => import('./pages/Settings/Events/EventsPage').then(m => ({ default: m.EventsPage })));
const ProjectsPage       = lazy(() => import('./pages/Settings/Projects/ProjectsPage').then(m => ({ default: m.ProjectsPage })));
const ProfilePage        = lazy(() => import('./pages/Settings/Profile/ProfilePage').then(m => ({ default: m.ProfilePage })));
const ExportPage         = lazy(() => import('./pages/Export/ExportPage').then(m => ({ default: m.ExportPage })));

function App() {
  const { session, profile } = useAuthStore();

  if (!session) return (
    <>
      <LoginPage />
      <ToastContainer />
      <PwaInstallBanner />
    </>
  );

  if (!profile?.approved) return (
    <>
      <WaitingPage />
      <ToastContainer />
    </>
  );

  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="expenses/new" element={<AddExpensePage />} />
            <Route path="expenses/:id/edit" element={<AddExpensePage />} />
            <Route path="budgets" element={<BudgetsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />}>
              <Route path="categories"      element={<CategoriesPage />} />
              <Route path="tags"            element={<TagsPage />} />
              <Route path="tag-groups"      element={<TagGroupsPage />} />
              <Route path="payment-methods" element={<PaymentMethodsPage />} />
              <Route path="events"          element={<EventsPage />} />
              <Route path="projects"        element={<ProjectsPage />} />
              <Route path="profile"         element={<ProfilePage />} />
              <Route path="export"          element={<ExportPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
      <ToastContainer />
      <PwaInstallBanner />
    </BrowserRouter>
  );
}

export default App;
