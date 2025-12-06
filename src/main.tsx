import { enableMapSet } from "immer";
enableMapSet();
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import '@/index.css'
import { HomePage } from '@/pages/HomePage'
import ReportBuilder from '@/pages/ReportBuilder';
import SessionList from '@/pages/SessionList';
import Exports from '@/pages/Exports';
import PdfGenerator from '@/pages/PdfGenerator';
import Patients from '@/pages/Patients';
import PatientDashboard from '@/pages/PatientDashboard';
const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/builder",
    element: <ReportBuilder />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/sessions",
    element: <SessionList />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/exports",
    element: <Exports />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/pdf-generator",
    element: <PdfGenerator />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/patients",
    element: <Patients />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/patients/:patientId",
    element: <PatientDashboard />,
    errorElement: <RouteErrorBoundary />,
  },
]);
 // Do not touch this code
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
)
// Dynamically import errorReporter after initial render to avoid module-initialization side-effects
void import('@/lib/errorReporter');