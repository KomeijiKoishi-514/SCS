// client/src/pages/AdminUsersPage.jsx

import React, { useState, useEffect } from "react";
import api from "../api/axiosConfig";
//  1. 引入 Framer Motion
import { motion, AnimatePresence } from "framer-motion";
import {
  UserGroupIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";

export default function AdminUsersPage() {
  // ===========================
  // 1. 狀態定義 (保持不變)
  // ===========================
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState({ type: '', content: '' });

  // --- Modal 相關狀態 ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingUser, setEditingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false); //  新增：密碼顯示狀態

  //  新增：十秒自動隱藏密碼的計時器機制
  useEffect(() => {
    let timer;
    if (showPassword) {
      timer = setTimeout(() => {
        setShowPassword(false);
      }, 10000);
    }
    return () => clearTimeout(timer);
  }, [showPassword]);

  // --- 表單資料狀態 ---
  const initialFormData = {
      username: '', full_name: '', email: '', password: '', role: 'student', dept_id: ''
  };
  const [formData, setFormData] = useState(initialFormData);

  const currentUserId = JSON.parse(localStorage.getItem("user_info") || "{}").id;

  // ===========================
  // 2. 副作用與輔助函式 (保持不變)
  // ===========================
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data);
      setError("");
    } catch (err) {
        console.error("載入失敗:", err);
        setError(err.response?.data?.message || "無法載入使用者列表。");
    } finally {
      setLoading(false);
    }
  };

  const getRoleName = (role) => {
      switch(role) {
          case 'admin': return '管理員';
          case 'student': return '學生';
          default: return role;
      }
  };

  // ===========================
  // 3. 處理表單與 Modal 操作
  // ===========================
  const handleOpenCreateModal = () => {
      setModalMode('create');
      setFormData(initialFormData);
      setEditingUser(null);
      setIsModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
      setModalMode('edit');
      setEditingUser(user);
      setFormData({
          username: user.username,
          full_name: user.full_name,
          email: user.email,
          password: '', // 編輯時不顯示原密碼，留空表示不修改
          role: user.role,
          dept_id: user.dept_id || ''
      });
      setIsModalOpen(true);
  };

  const handleCloseModal = () => {
      setIsModalOpen(false);
      setEditingUser(null);
      setFormData(initialFormData);
      setShowPassword(false); //  關閉 Modal 時一併重置密碼顯示狀態
  };

  // --- 表單變更處理 ---
  const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData(prevData => {
          // 如果角色變更為 admin，清空 dept_id 
          if (name === 'role' && value === 'admin') {
               return { ...prevData, [name]: value, dept_id: '' };
          }
          return { ...prevData, [name]: value };
      });
  };

  // --- 送出表單 (新增 / 編輯) ---
  const handleSubmit = async (e) => {
      e.preventDefault();
      setSubmitting(true);
      setActionMessage({ type: '', content: '' });

      try {
          // 編輯模式：準備要送出的資料
          let submitData = { ...formData };

          if (modalMode === 'edit') {
              // 如果沒有輸入密碼，代表不修改，從物件中移除 password 屬性
              if (!submitData.password) {
                  delete submitData.password;
              }
              // 呼叫更新 API
              await api.put(`/admin/users/${editingUser.user_id}`, submitData);
              setActionMessage({ type: 'success', content: '使用者更新成功！' });
          } else {
              // 呼叫新增 API
              // 確保密碼有填寫
              if (modalMode === 'create' && !formData.password) {
                  throw new Error("新增使用者時密碼為必填");
              }
              await api.post("/admin/users", submitData);
              setActionMessage({ type: 'success', content: '新增使用者成功！' });
          }

          // 重新載入列表並關閉 Modal
          fetchUsers();
          setTimeout(() => handleCloseModal(), 1500); // 延遲關閉讓使用者看到成功訊息

      } catch (err) {
          console.error("儲存失敗:", err);
          setActionMessage({ 
              type: 'error', 
              content: err.response?.data?.message || err.message || "儲存時發生錯誤" 
          });
      } finally {
          setSubmitting(false);
      }
  };

  // --- 刪除使用者 ---
  const handleDelete = async (userId) => {
      if (userId === currentUserId) {
          alert("無法刪除目前的登入帳號！");
          return;
      }
      
      if (!window.confirm("確定要刪除此使用者嗎？此動作無法復原。")) {
          return;
      }

      try {
          await api.delete(`/admin/users/${userId}`);
          // 本地移除，不需重新 fetch
          setUsers(users.filter(u => u.user_id !== userId));
          setActionMessage({ type: 'success', content: '使用者已成功刪除。' });
          setTimeout(() => setActionMessage({ type: '', content: '' }), 3000);
      } catch (err) {
          console.error("刪除失敗:", err);
          setActionMessage({ type: 'error', content: err.response?.data?.message || "刪除時發生錯誤" });
      }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <UserGroupIcon className="h-8 w-8 mr-3 text-blue-600" />
            使用者管理
            </h1>
            <p className="text-gray-500 mt-2">管理系統中的所有學生與管理員帳號。</p>
        </div>
        <button
            onClick={handleOpenCreateModal}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
        >
            <PlusIcon className="h-5 w-5 mr-2" />
            新增使用者
        </button>
      </div>

      {/* 提示訊息 */}
      {actionMessage.content && !isModalOpen && (
          <div className={`mb-6 p-4 rounded-lg flex items-center ${actionMessage.type === 'success' ? 'bg-green-50 text-green-800 border-l-4 border-green-500' : 'bg-red-50 text-red-800 border-l-4 border-red-500'}`}>
               <span className="font-medium">{actionMessage.content}</span>
          </div>
      )}

      {/* 錯誤處理與載入狀態 */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">帳號 (學號)</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">系所</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.user_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.full_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                        {getRoleName(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.dept_id || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleOpenEditModal(user)} className="text-indigo-600 hover:text-indigo-900 mr-4 transition" title="編輯">
                        <PencilSquareIcon className="h-5 w-5 inline" />
                      </button>
                      <button 
                         onClick={() => handleDelete(user.user_id)} 
                         className={`transition ${user.user_id === currentUserId ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-900'}`}
                         disabled={user.user_id === currentUserId}
                         title={user.user_id === currentUserId ? "無法刪除自己" : "刪除"}
                      >
                        <TrashIcon className="h-5 w-5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
                 <div className="p-8 text-center text-gray-500">目前沒有使用者資料。</div>
            )}
          </div>
        </div>
      )}

      {/* =========================================
           新增 / 編輯使用者的 Modal 
          ========================================= */}
      <AnimatePresence>
        {isModalOpen && (
            <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50 backdrop-blur-sm"
            >
                <motion.div
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                    className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
                >
                    {/* Modal 標頭 */}
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="text-lg font-bold text-gray-900">
                            {modalMode === 'create' ? '新增使用者' : '編輯使用者'}
                        </h3>
                        <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Modal 內容 (表單) */}
                    <form onSubmit={handleSubmit} className="px-6 py-4">
                        
                        {/* Modal 內的訊息提示 */}
                        {actionMessage.content && (
                            <div className={`mb-4 p-3 rounded-md text-sm ${actionMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {actionMessage.content}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            {/* 帳號 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">帳號 (學號) *</label>
                                <input type="text" name="username" required value={formData.username} onChange={handleChange} className="w-full p-2 border rounded focus:ring-blue-500" />
                            </div>
                            {/* 姓名 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
                                <input type="text" name="full_name" required value={formData.full_name} onChange={handleChange} className="w-full p-2 border rounded focus:ring-blue-500" />
                            </div>
                        </div>

                        {/* 信箱 */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">電子郵件 *</label>
                            <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full p-2 border rounded focus:ring-blue-500" />
                        </div>

                         {/* 密碼 (編輯模式為選填) */}
                         <div className="relative pb-6 mb-4"> {/* 增加 pb-6 預留空間 */}
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                密碼 {modalMode === 'create' ? '*' : '(若不修改請留空)'}
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    // 新增模式必填，編輯模式選填
                                    required={modalMode === 'create'}
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder={modalMode === 'edit' ? "不修改請留空" : "請輸入密碼"}
                                    className="appearance-none block w-full p-2 pr-10 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                                    disabled={submitting}
                                />
                                {/* 顯示密碼切換按鈕 */}
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={submitting}
                                    tabIndex="-1"
                                >
                                    {showPassword ? (
                                        <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                                    ) : (
                                        <EyeIcon className="h-5 w-5" aria-hidden="true" />
                                    )}
                                </button>
                            </div>
                            {/* 狀態提示文字 */}
                            {showPassword && (
                                <p className="absolute right-1 bottom-1 text-xs font-medium text-blue-500 animate-pulse">
                                    密碼將於 10 秒後自動隱藏
                                </p>
                            )}
                        </div>

                        {/* 角色與系所 */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">角色 *</label>
                                <select name="role" value={formData.role} onChange={handleChange} className="w-full p-2 border rounded focus:ring-blue-500 bg-white">
                                    <option value="student">學生 (student)</option>
                                    <option value="admin">管理員 (admin)</option>
                                </select>
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${formData.role === 'admin' ? 'text-gray-400' : 'text-gray-700'}`}>
                                    系所代碼
                                    {formData.role === 'admin' && <span className="text-xs ml-2">(管理員毋需填寫)</span>}
                                </label>
                                <input
                                    type="number"
                                    name="dept_id"
                                    value={formData.dept_id}
                                    onChange={handleChange}
                                    // 1. 根據角色決定 placeholder 提示文字
                                    placeholder={formData.role === 'admin' ? "不適用" : "例如: 510"}
                                    // 2. 核心：如果角色是 admin，就禁用此欄位
                                    disabled={formData.role === 'admin'}
                                    // 3. 根據禁用狀態改變樣式 (變灰、滑鼠游標變成禁止符號)
                                    className={`w-full p-2 border rounded transition-colors ${formData.role === 'admin' ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'focus:ring-blue-500 bg-white'}`}
                                />
                            </div>
                        </div>

                        {/* 按鈕區 */}
                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 mt-6">
                            <button type="button" onClick={handleCloseModal} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">取消</button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className={`px-4 py-2 rounded-lg text-white font-medium transition flex items-center ${submitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                 {submitting && <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                                 {submitting ? '儲存中...' : '確認儲存'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}