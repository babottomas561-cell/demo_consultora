import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export const ProtectedRoute = () => {
  const token = useAuthStore((state) => state.token);
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return <Outlet />;
};

export const AdminRoute = () => {
  const user = useAuthStore((state) => state.user);
  
  if (!user || !user.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Outlet />;
};
