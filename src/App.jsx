import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { isConfigured } from './lib/supabase'
import Layout from './components/Layout'
import SetupNotice from './components/SetupNotice'
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute'
import { FullPageSpinner, PageLoader } from './components/ui'

const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Transactions = lazy(() => import('./pages/Transactions'))
const Accounts = lazy(() => import('./pages/Accounts'))
const Budgets = lazy(() => import('./pages/Budgets'))
const Goals = lazy(() => import('./pages/Goals'))
const Reports = lazy(() => import('./pages/Reports'))
const Categories = lazy(() => import('./pages/Categories'))
const Settings = lazy(() => import('./pages/Settings'))
const Admin = lazy(() => import('./pages/Admin'))

function AuthedShell() {
  return (
    <ProtectedRoute>
      <DataProvider>
        <Layout />
      </DataProvider>
    </ProtectedRoute>
  )
}

function Page({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export default function App() {
  if (!isConfigured) {
    return (
      <ThemeProvider>
        <SetupNotice />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Suspense fallback={<FullPageSpinner />}>
            <Routes>
              <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
              <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
              <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route element={<AuthedShell />}>
                <Route index element={<Page><Dashboard /></Page>} />
                <Route path="transactions" element={<Page><Transactions /></Page>} />
                <Route path="accounts" element={<Page><Accounts /></Page>} />
                <Route path="budgets" element={<Page><Budgets /></Page>} />
                <Route path="goals" element={<Page><Goals /></Page>} />
                <Route path="reports" element={<Page><Reports /></Page>} />
                <Route path="categories" element={<Page><Categories /></Page>} />
                <Route path="settings" element={<Page><Settings /></Page>} />
                <Route path="admin" element={<Page><Admin /></Page>} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
