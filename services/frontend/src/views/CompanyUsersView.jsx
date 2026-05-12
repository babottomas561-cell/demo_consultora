import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Trash2, Pencil, Loader2, ShieldCheck, User, X, Check } from 'lucide-react';
import apiClient from '../api/client';

// ── Inline edit row ────────────────────────────────────────────────────────────

const EditRow = ({ user, onSave, onCancel }) => {
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(user.is_admin);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = { email, is_admin: isAdmin };
      if (password) payload.password = password;
      const res = await apiClient.put(`/users/${user.id}`, payload);
      onSave(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="bg-indigo-50">
      <td className="px-4 py-3">
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </td>
      <td className="px-4 py-3">
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Nueva contraseña (opcional)"
          className="w-full px-2 py-1.5 text-sm border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </td>
      <td className="px-4 py-3 text-center">
        <input
          type="checkbox"
          checked={isAdmin}
          onChange={e => setIsAdmin(e.target.checked)}
          className="w-4 h-4 accent-indigo-600 cursor-pointer"
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2 justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Guardar
          </button>
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <X size={12} /> Cancelar
          </button>
        </div>
      </td>
    </tr>
  );
};

// ── Add user form ──────────────────────────────────────────────────────────────

const AddUserForm = ({ companyId, onCreated, onCancel }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!email || !password) { setError('Email y contraseña son obligatorios'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await apiClient.post('/users/', { email, password, is_admin: isAdmin, company_id: companyId });
      onCreated(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al crear usuario');
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="bg-green-50 border-t-2 border-green-200">
      <td className="px-4 py-3">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="usuario@empresa.com"
          className="w-full px-2 py-1.5 text-sm border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          autoFocus
        />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </td>
      <td className="px-4 py-3">
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Contraseña"
          className="w-full px-2 py-1.5 text-sm border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </td>
      <td className="px-4 py-3 text-center">
        <input
          type="checkbox"
          checked={isAdmin}
          onChange={e => setIsAdmin(e.target.checked)}
          className="w-4 h-4 accent-green-600 cursor-pointer"
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2 justify-end">
          <button
            onClick={handleCreate}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
            Crear
          </button>
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <X size={12} /> Cancelar
          </button>
        </div>
      </td>
    </tr>
  );
};

// ── Main view ──────────────────────────────────────────────────────────────────

const CompanyUsersView = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [compRes, usersRes] = await Promise.all([
          apiClient.get(`/companies/`),
          apiClient.get(`/users/`, { params: { company_id: companyId } }),
        ]);
        const company = compRes.data.find(c => String(c.id) === String(companyId));
        setCompanyName(company?.name || `Empresa ${companyId}`);
        setUsers(usersRes.data);
      } catch {
        setError('Error al cargar los datos.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [companyId]);

  const handleSaved = (updated) => {
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    setEditingId(null);
  };

  const handleCreated = (newUser) => {
    setUsers(prev => [...prev, newUser]);
    setAdding(false);
  };

  const handleDelete = async (userId) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    try {
      await apiClient.delete(`/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al eliminar usuario');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/companies')}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
          <p className="text-slate-500 mt-0.5 text-sm">{companyName}</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-100 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-indigo-500" size={32} />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contraseña</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 && !adding && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                    No hay usuarios para esta empresa.
                  </td>
                </tr>
              )}
              {users.map(user =>
                editingId === user.id ? (
                  <EditRow
                    key={user.id}
                    user={user}
                    onSave={handleSaved}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                          {user.is_admin ? <ShieldCheck size={16} /> : <User size={16} />}
                        </div>
                        <span className="font-medium text-slate-800">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs tracking-widest">••••••••</td>
                    <td className="px-4 py-3 text-center">
                      {user.is_admin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                          <ShieldCheck size={11} /> Admin
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => { setAdding(false); setEditingId(user.id); }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <Pencil size={12} /> Editar
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={12} /> Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
              {adding && (
                <AddUserForm
                  companyId={Number(companyId)}
                  onCreated={handleCreated}
                  onCancel={() => setAdding(false)}
                />
              )}
            </tbody>
          </table>

          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
            <button
              onClick={() => { setEditingId(null); setAdding(true); }}
              disabled={adding}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-40"
            >
              <UserPlus size={16} /> Agregar usuario
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyUsersView;
