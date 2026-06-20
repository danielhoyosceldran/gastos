import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { LoginPage } from './pages/auth/LoginPage';
import { WaitingPage } from './pages/auth/WaitingPage';
import { AppLayout } from './components/Layout/AppLayout';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { BudgetsPage } from './pages/Budgets/BudgetsPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { CategoriesPage } from './pages/Settings/Categories/CategoriesPage';
import { TagsPage } from './pages/Settings/Tags/TagsPage';
import { TagGroupsPage } from './pages/Settings/TagGroups/TagGroupsPage';
import { PaymentMethodsPage } from './pages/Settings/PaymentMethods/PaymentMethodsPage';
import { EventsPage } from './pages/Settings/Events/EventsPage';
import { ProjectsPage } from './pages/Settings/Projects/ProjectsPage';
import { ProfilePage } from './pages/Settings/Profile/ProfilePage';
import { ExportPage } from './pages/Export/ExportPage';
import { AnalyticsPage } from './pages/Analytics/AnalyticsPage';
import { AddExpensePage } from './pages/Expenses/AddExpensePage';
import { ToastContainer } from './components/Toast/ToastContainer';
import { PwaInstallBanner } from './components/PwaInstallBanner/PwaInstallBanner';

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
      <ToastContainer />
      <PwaInstallBanner />
    </BrowserRouter>
  );
}

export default App;
