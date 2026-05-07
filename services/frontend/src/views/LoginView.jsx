import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, TrendingUp } from 'lucide-react';
import apiClient from '../api/client';
import useAuthStore from '../store/authStore';

const LoginView = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // POST to /api/v1/auth/login
      const response = await apiClient.post('/auth/login', {
        email,
        password
      });
      
      const { access_token, user } = response.data;
      
      // We don't have the user object in the response.
      // Wait, let's check what the backend returns. 
      // Fastapi login usually returns: {"access_token": "...", "token_type": "bearer"}
      // We need to parse the JWT to get user info, or assume we just store the token.
      // Let's decode the JWT payload using generic base64 decode, since it contains the user dict.
      const payloadBase64 = access_token.split('.')[1];
      const payloadJson = atob(payloadBase64);
      const decodedUser = JSON.parse(payloadJson);
      
      login(decodedUser, access_token);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Credenciales inválidas o error de red.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center">
          <div className="bg-indigo-600 p-3 rounded-xl shadow-lg">
            <TrendingUp className="text-white" size={32} />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Ingreso a la Plataforma
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Demo Consultora BI & Financial Engine
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm transition-shadow"
                  placeholder="admin@demo.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Contraseña</label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm transition-shadow"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4 border border-red-100">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Iniciar Sesión'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
