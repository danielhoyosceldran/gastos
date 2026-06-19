import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { LoginPage } from './pages/auth/LoginPage';
import { WaitingPage } from './pages/auth/WaitingPage';
import { AppLayout } from './components/Layout/AppLayout';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { ExpensesPage } from './pages/Expenses/ExpensesPage';
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
import { ToastContainer } from './components/Toast/ToastContainer';

function App() {
  const { session, profile } = useAuthStore();

  if (!session) return (
    <>
      <LoginPage />
      <ToastContainer />
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
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="budgets" element={<BudgetsPage />} />
          <Route path="export" element={<ExportPage />} />
          <Route path="settings" element={<SettingsPage />}>
            <Route index element={<Navigate to="categories" replace />} />
            <Route path="categories"      element={<CategoriesPage />} />
            <Route path="tags"            element={<TagsPage />} />
            <Route path="tag-groups"      element={<TagGroupsPage />} />
            <Route path="payment-methods" element={<PaymentMethodsPage />} />
            <Route path="events"          element={<EventsPage />} />
            <Route path="projects"        element={<ProjectsPage />} />
            <Route path="profile"         element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
