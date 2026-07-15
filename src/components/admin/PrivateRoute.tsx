import { Navigate } from 'react-router-dom';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const isAdminLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';
  const mfaEnabled = sessionStorage.getItem('admin_mfa_enabled') === 'true';
  const adminId = sessionStorage.getItem('admin_id');
  const adminUsername = sessionStorage.getItem('admin_username');
  const adminRole = sessionStorage.getItem('admin_role');

  if (!isAdminLoggedIn) {
    return <Navigate to="/admin/login" replace />;
  }

  // 已登入但未啟用 MFA → 強制要求設定雙重認證
  if (!mfaEnabled && adminId) {
    sessionStorage.setItem('admin_mfa_pending', JSON.stringify({
      adminId,
      username: adminUsername || '',
      role: adminRole || '',
      timestamp: Date.now(),
    }));
    return <Navigate to="/admin/mfa-setup" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;