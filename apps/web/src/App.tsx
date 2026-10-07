import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './auth/protected-route';
import { LoginPage } from './pages/LoginPage';
import { Stage2ProtectedPage } from './pages/Stage2ProtectedPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/staff/*" element={<Stage2ProtectedPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
