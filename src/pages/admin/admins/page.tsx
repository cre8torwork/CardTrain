import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EDGE_FUNCTIONS } from '../../../lib/edgeFunctions';
import AdminLayout from '../../../components/admin/AdminLayout';
import PrivateRoute from '../../../components/admin/PrivateRoute';
import AdminAddModal from './components/AdminAddModal';
import AdminDeleteModal from './components/AdminDeleteModal';
import AdminPasswordModal from './components/AdminPasswordModal';
import AdminMfaSetupModal from './components/AdminMfaSetupModal';

interface Admin {
  id: string;
  username: string;
  mfa_enabled: boolean;
  role?: string;
  created_at: string;
  updated_at: string;
}

export default function AdminsManagement() {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [currentUsername, setCurrentUsername] = useState('');

  useEffect(() => {
    const username = localStorage.getItem('admin_username') || sessionStorage.getItem('admin_username') || '';
    setCurrentUsername(username);
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(EDGE_FUNCTIONS.adminAuth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_admins' }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || '獲取管理員列表失敗');
      }
      setAdmins(result.admins || []);
    } catch (err: any) {
      setError(err.message || '獲取管理員列表失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSuccess = () => {
    setShowAddModal(false);
    fetchAdmins();
  };

  const handleDeleteClick = (admin: Admin) => {
    setSelectedAdmin(admin);
    setShowDeleteModal(true);
  };

  const handleDeleteSuccess = () => {
    setShowDeleteModal(false);
    setSelectedAdmin(null);
    fetchAdmins();
  };

  const handlePasswordClick = (admin: Admin) => {
    setSelectedAdmin(admin);
    setShowPasswordModal(true);
  };

  const handlePasswordSuccess = () => {
    setShowPasswordModal(false);
    setSelectedAdmin(null);
  };

  const handleMfaClick = (admin: Admin) => {
    setSelectedAdmin(admin);
    setShowMfaModal(true);
  };

  const handleMfaSuccess = () => {
    setShowMfaModal(false);
    setSelectedAdmin(null);
    fetchAdmins();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <PrivateRoute>
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">管理員帳號管理</h1>
              <p className="text-sm text-gray-500 mt-1">管理系統管理員帳號</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-rose-500 to-pink-600 text-white px-6 py-2.5 rounded-lg font-medium hover:from-rose-600 hover:to-pink-700 transition-all duration-300 flex items-center gap-2 whitespace-nowrap"
            >
              <i className="ri-user-add-line text-lg"></i>
              <span>新增管理員</span>
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <i className="ri-loader-4-line text-4xl text-rose-500 animate-spin"></i>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <i className="ri-error-warning-line text-4xl text-red-400 mb-3"></i>
                <p className="text-red-500 mb-3">{error}</p>
                <button onClick={fetchAdmins} className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-semibold hover:bg-rose-600 cursor-pointer whitespace-nowrap">
                  重新載入
                </button>
              </div>
            ) : admins.length === 0 ? (
              <div className="text-center py-20">
                <i className="ri-user-line text-6xl text-gray-300 mb-4"></i>
                <p className="text-gray-400">暫無管理員帳號</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        帳號名稱
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        建立時間
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        最後更新
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        MFA
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {admins.map((admin) => {
                      const isCurrentUser = admin.username === currentUsername;
                      return (
                        <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white font-semibold">
                                {admin.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-gray-800 flex items-center gap-2">
                                  {admin.username}
                                  {isCurrentUser && (
                                    <span className="text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                                      目前登入
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {formatDate(admin.created_at)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {formatDate(admin.updated_at)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {admin.mfa_enabled ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                <i className="ri-shield-check-line"></i>
                                已啟用
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                                <i className="ri-shield-line"></i>
                                未啟用
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2 flex-wrap">
                              <button
                                onClick={() => handleMfaClick(admin)}
                                className={`px-3 py-1.5 rounded-lg transition-colors text-sm font-medium flex items-center gap-1 whitespace-nowrap ${
                                  admin.mfa_enabled
                                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                                }`}
                              >
                                <i className={admin.mfa_enabled ? 'ri-shield-flash-line' : 'ri-shield-keyhole-line'}></i>
                                <span>{admin.mfa_enabled ? '管理 MFA' : '啟用 MFA'}</span>
                              </button>
                              <button
                                onClick={() => handlePasswordClick(admin)}
                                className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors text-sm font-medium flex items-center gap-1 whitespace-nowrap"
                              >
                                <i className="ri-lock-password-line"></i>
                                <span>修改密碼</span>
                              </button>
                              <button
                                onClick={() => handleDeleteClick(admin)}
                                disabled={isCurrentUser}
                                className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                              >
                                <i className="ri-delete-bin-line"></i>
                                <span>刪除</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {showAddModal && (
            <AdminAddModal
              onClose={() => setShowAddModal(false)}
              onSuccess={handleAddSuccess}
            />
          )}

          {showDeleteModal && selectedAdmin && (
            <AdminDeleteModal
              admin={selectedAdmin}
              onClose={() => {
                setShowDeleteModal(false);
                setSelectedAdmin(null);
              }}
              onSuccess={handleDeleteSuccess}
            />
          )}

          {showPasswordModal && selectedAdmin && (
            <AdminPasswordModal
              admin={selectedAdmin}
              onClose={() => {
                setShowPasswordModal(false);
                setSelectedAdmin(null);
              }}
              onSuccess={handlePasswordSuccess}
            />
          )}

          {showMfaModal && selectedAdmin && (
            <AdminMfaSetupModal
              adminId={selectedAdmin.id}
              adminUsername={selectedAdmin.username}
              currentlyEnabled={selectedAdmin.mfa_enabled}
              onClose={() => {
                setShowMfaModal(false);
                setSelectedAdmin(null);
              }}
              onSuccess={handleMfaSuccess}
            />
          )}
        </div>
      </AdminLayout>
    </PrivateRoute>
  );
}