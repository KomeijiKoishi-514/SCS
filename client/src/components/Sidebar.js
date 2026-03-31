/*=====================================================
   SIDE BAR (包含帳號管理按鈕版)
=====================================================*/

import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  MapIcon,
  BookOpenIcon,
  UserGroupIcon,
  CalendarDaysIcon, 
  KeyIcon,
  ArrowLeftOnRectangleIcon,
  AcademicCapIcon,
  UserCircleIcon
} from "@heroicons/react/24/outline";

export default function Sidebar({ isCollapsed, toggleSidebar }) {
  const nav = useNavigate();
  const location = useLocation(); // 取得目前網址路徑，用於高亮顯示當前選項

  // ... (省略中間取得 user, isLoggedIn, isAdmin, logout, getRoleName 的邏輯，保持不變) ...
  // 1. 取得使用者資訊與角色
  let user = null;
  try {
    const userInfoStr = localStorage.getItem("user_info");
    if (userInfoStr) {
      user = JSON.parse(userInfoStr);
    }
  } catch (e) {
    console.error("解析使用者資訊失敗:", e);
    localStorage.removeItem("user_info");
    localStorage.removeItem("auth_token");
  }

  // 2. 判斷是否登入
  const isLoggedIn = !!localStorage.getItem("auth_token");

  // 3. 判斷是否為管理員
  const isAdmin = isLoggedIn && user && user.role === 'admin';

  // 登出函式
  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_info");
    nav("/login");
  };

  const iconClass = "h-6 w-6 flex-shrink-0";

  const getRoleName = (role) => {
      if (role === 'admin') return '管理員';
      if (role === 'student') return '學生';
      return role;
  };

  // 輔助函式：判斷連結是否為當前頁面，並回傳對應的樣式
  const getLinkClass = (path) => {
    // 簡單判斷：如果當前路徑以該連結開頭，就視為啟用狀態 (例如 /admin/users 也算在 /admin 內)
    // 但為了區分 /admin 和 /admin/users，我們這裡用精確比對或特定前綴
    const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path + '/'));

    return `flex items-center p-3 rounded-lg transition-colors group ${
      isCollapsed ? "justify-center" : "space-x-4"
    } ${
      isActive
        ? "bg-blue-700 text-yellow-300" // 當前頁面樣式
        : "hover:bg-blue-700/50 hover:text-yellow-300" // 一般狀態樣式
    }`;
  };

return (
    <nav
      className={`h-screen bg-blue-600 text-white flex flex-col p-4 shadow-lg flex-shrink-0
        ${isCollapsed ? "w-20" : "w-64"} transition-all duration-300 ease-in-out overflow-hidden select-none z-30 relative border-r border-blue-700`}
    >
      {/* ==================== 頂部：Logo 與標題 ==================== */}
      <Link
        to="/"  // 👈 這裡改為 "/"
        className={`flex items-center mb-8 p-2 transition-all duration-300 hover:opacity-80 ${
          isCollapsed ? "justify-center" : "space-x-3"
        }`}
        title="回到首頁"
      >
      <AcademicCapIcon className="h-10 w-10 text-yellow-300 flex-shrink-0" />
        <h1
          className={`text-xl font-bold whitespace-nowrap overflow-hidden transition-all duration-300 ${
            isCollapsed ? "w-0 opacity-0" : "w-full opacity-100"
          }`}
        >
          學生修業系統
        </h1>
      </Link>

      {/* ==================== 中間：主要導覽連結 ==================== */}
      <div className="flex-1 flex flex-col space-y-2 overflow-y-auto scrollbar-hide">
        {/* 1. 學程地圖 (所有人可見) */}
        <Link to="/curriculum" className={getLinkClass("/curriculum")} title={isCollapsed ? "學程地圖" : ""}>
          <MapIcon className={iconClass} />
          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 font-medium ${isCollapsed ? "w-0 opacity-0" : "w-full opacity-100"}`}>
            學程地圖
          </span>
        </Link>
        <Link to="/planning" className={getLinkClass("/planning")} title={isCollapsed ? "課程規劃" : ""}>
          <CalendarDaysIcon className={iconClass} />
          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 font-medium ${isCollapsed ? "w-0 opacity-0" : "w-full opacity-100"}`}>
            課程規劃
          </span>
        </Link>
        {/*  管理員專區  */}
        {isAdmin && (
          <>
            {/* 1.  分隔線與標題 (僅展開時顯示) */}
            {!isCollapsed && (
               <div
                className={`pl-3 text-xs font-semibold text-blue-200 uppercase tracking-wider transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap
                ${isCollapsed ? "h-0 opacity-0 pt-0 pb-0" : "h-auto opacity-100 pt-4 pb-1"
            }`}
            >
            管理功能
            </div>
            )}

            {/* 2. 課程管理 (原本的 /admin) */}
            <Link to="/admin" className={getLinkClass("/admin")} title={isCollapsed ? "課程管理" : ""}>
              {/* 改用書本圖標 */}
              <BookOpenIcon className={iconClass} />
              <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 font-medium ${isCollapsed ? "w-0 opacity-0" : "w-full opacity-100"}`}>
                課程管理
              </span>
            </Link>

            {/*  3. 新增：帳號管理 (/adminuser) */}
            <Link to="/adminuser" className={getLinkClass("/adminuser")} title={isCollapsed ? "帳號管理" : ""}>
              <UserGroupIcon className={iconClass} />
              <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 font-medium ${isCollapsed ? "w-0 opacity-0" : "w-full opacity-100"}`}>
                帳號管理
              </span>
            </Link>
          </>
        )}
      </div>

      {/* ==================== 底部：使用者區塊 ==================== */}
      <div className="mt-auto mb-2 space-y-4">
        {/* (假設你的收合按鈕已經移到外部 App.js 了，這裡就不需要了) */}
        {/* <div className="border-t border-blue-500/50 mx-2"></div> */}

        {/* 3. 使用者狀態區塊 */}
        {!isLoggedIn ? (
          /* 尚未登入：顯示登入按鈕 */
          <Link to="/login" className={`flex items-center p-3 rounded-lg bg-yellow-400 text-blue-900 hover:bg-yellow-300 transition-colors shadow-sm font-bold ${isCollapsed ? "justify-center" : "space-x-4 px-4 justify-center"}`} title={isCollapsed ? "登入" : ""}>
            <KeyIcon className={`${iconClass} ${isCollapsed?'':'h-5 w-5'}`} />
            <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? "w-0 opacity-0" : "w-full opacity-100"}`}>使用者登入</span>
          </Link>
        ) : (
          /* 已登入：顯示使用者區塊 (連結至個人檔案) */
          <Link
            to="/profile"
            className={`block rounded-xl bg-blue-700/30 hover:bg-blue-700/50 transition-all duration-300 group/profile ${isCollapsed ? 'p-2 mx-1' : 'p-3'}`}
            title="前往個人檔案設定"
          >
            {/* 上半部：使用者頭像與資訊 */}
            <div className={`flex items-center transition-all duration-300 ${isCollapsed ? "justify-center" : "space-x-3 mb-3"}`}>
              {/* 頭像 */}
              <div className={`bg-blue-500/50 group-hover/profile:bg-blue-500 rounded-full transition-all ${isCollapsed ? 'p-1' : 'p-1.5'}`}>
                <UserCircleIcon className={`text-blue-100 transition-all ${isCollapsed ? 'h-6 w-6' : 'h-7 w-7'}`} />
              </div>

              {/* 名稱與角色 */}
              <div className={`flex flex-col overflow-hidden transition-all duration-300 ${isCollapsed ? "w-0 opacity-0 h-0 scale-0" : "w-full opacity-100 scale-100"}`}>
                <span className="font-bold truncate text-[15px] group-hover/profile:text-yellow-300 transition-colors">
                  {user?.name || user?.full_name || user?.username}
                </span>
                <span className="text-xs text-blue-200 truncate bg-blue-800/40 px-2 py-0.5 rounded-full inline-block self-start mt-0.5">
                  {getRoleName(user?.role)}
                </span>
              </div>
            </div>

            {/* 下半部：登出按鈕 (僅展開時顯示) */}
            {!isCollapsed && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  logout();
                }}
                className="flex items-center w-full text-left p-2 rounded-lg bg-red-500/80 hover:bg-red-600 text-white transition-all duration-300 outline-none group space-x-2 justify-center mt-1 relative z-10"
                title="登出"
              >
                <ArrowLeftOnRectangleIcon className="h-5 w-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span className="whitespace-nowrap overflow-hidden text-sm font-medium">
                  登出系統
                </span>
              </button>
            )}
          </Link>
        )}
      </div>
    </nav>
  );
}