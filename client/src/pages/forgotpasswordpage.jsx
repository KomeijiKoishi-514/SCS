// client/src/pages/ForgotPasswordPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig'; // 引入我們設定好的 axios 實體
import { EnvelopeIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(''); // 用來顯示成功訊息
  const [error, setError] = useState('');   // 用來顯示錯誤訊息
  const [loading, setLoading] = useState(false); // 控制按鈕的載入狀態

  const handleSubmit = async (e) => {
    e.preventDefault();
    // 重置狀態
    setMessage('');
    setError('');
    setLoading(true);

    try {
      // 呼叫後端 API
      const res = await api.post('/auth/forgot-password', { email });
      
      // API 呼叫成功，顯示後端回傳的訊息
      setMessage(res.data.message);
      // 清空輸入框
      setEmail('');

    } catch (err) {
      console.error("發送重設請求失敗:", err);
      // 顯示錯誤訊息，如果沒有特定訊息就顯示預設文字
      setError(err.response?.data?.message || '發送請求時發生錯誤，請稍後再試。');
    } finally {
      // 無論成功或失敗，都結束載入狀態
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl">
        
        {/* 標題區塊 */}
        <div className="text-center">
          <EnvelopeIcon className="mx-auto h-12 w-12 text-blue-500" />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            忘記密碼？
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            別擔心，請輸入您註冊時使用的 Email，<br/>我們將寄送重設連結給您。
          </p>
        </div>

        {/* 訊息提示區塊 */}
        {message && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{message}</p>
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* 表單區塊 */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email-address" className="sr-only">
              Email address
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="請輸入您的 Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || message} // 如果正在載入或已顯示成功訊息，禁用輸入框
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || message}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white transition-colors
                ${loading || message ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"}`}
            >
              {loading && (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {loading ? "發送中..." : "發送重設連結"}
            </button>
          </div>

          <div className="flex items-center justify-center mt-4">
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 flex items-center transition-colors">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              返回登入頁面
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}