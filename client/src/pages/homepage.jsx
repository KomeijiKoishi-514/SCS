// client/src/pages/HomePage.jsx

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapIcon,
  CalendarDaysIcon,
  UserCircleIcon,
  KeyIcon,
  AcademicCapIcon,
  ArrowRightIcon
} from "@heroicons/react/24/outline";

export default function HomePage() {
  // 檢查登入狀態，用於決定顯示什麼按鈕
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    setIsLoggedIn(!!token);
    if (token) {
        try {
            const user = JSON.parse(localStorage.getItem("user_info"));
            //  捕捉使用者名稱
            //setUserName(user?.full_name || user?.username || "同學");
            const DisplayName = user?.name || user?.full_name || user?.username;
            setUserName(DisplayName,"同學");
        } catch (e) {
            console.error("解析使用者資料失敗", e);
        }
    }
  }, []);

  // 動畫設定
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 } // 子元素依序顯示
    }
  };

  //const itemVariants = {
  //  hidden: { y: 20, opacity: 0 },
  //  visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
  //};

  return (
    <div className="min-h-screen bg-gray-50 overflow-hidden">
      {/* ==========================
          Hero Section (醒目題詞區)
      ========================== */}
      <div className="relative bg-blue-600 text-white overflow-hidden rounded-bl-[3rem] rounded-br-[3rem] shadow-lg">
        {/* 背景裝飾圖形 */}
        <div className="absolute inset-0">
            <svg className="absolute bottom-0 left-0 transform translate-x-[-20%] translate-y-[10%] text-blue-500/30 h-96 w-96" fill="currentColor" viewBox="0 0 200 200"><path d="M42.7,-62.9C54.3,-52.8,62.2,-38.6,68.4,-23.3C74.6,-8,79.1,8.3,76.1,23.3C73.1,38.4,62.6,52.1,49.4,62.1C36.3,72.1,20.4,78.4,3.6,73.5C-13.2,68.5,-30.9,52.4,-45.4,38.3C-60,24.2,-71.3,12.1,-73.5,-1.3C-75.8,-14.7,-68.9,-29.4,-57.7,-40.7C-46.6,-52,-31.1,-59.9,-16.5,-65.5C-1.9,-71.1,11.8,-74.5,25.9,-70.5C40,-66.5,54.6,-55.1,42.7,-62.9Z" transform="translate(100 100)" /></svg>
            <svg className="absolute top-0 right-0 transform translate-x-[20%] translate-y-[-30%] text-blue-400/30 h-80 w-80" fill="currentColor" viewBox="0 0 200 200"><path d="M34.7,-44.3C44.2,-34.2,50.6,-21.9,54.4,-8.2C58.1,5.5,59.3,20.7,53.2,33.1C47.1,45.5,33.7,55.2,19.1,59.6C4.5,64.1,-11.4,63.3,-26.5,56.6C-41.7,49.9,-56.1,37.2,-63.3,20.7C-70.4,4.1,-70.3,-16.3,-62.6,-31.8C-54.8,-47.3,-39.5,-57.9,-24.7,-61.6C-9.9,-65.3,4.3,-62.2,17.2,-56.1C30.1,-50,41.6,-41,34.7,-44.3Z" transform="translate(100 100)" /></svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 flex flex-col items-center text-center z-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="mb-6 p-3 bg-blue-500/40 rounded-full inline-block"
          >
             <AcademicCapIcon className="h-16 w-16 text-yellow-300" />
          </motion.div>
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-4xl tracking-tight font-extrabold sm:text-5xl md:text-6xl"
          >
            {isLoggedIn ? `歡迎回來，${userName}！` : "歡迎使用學生修業系統"}
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-6 max-w-md mx-auto text-lg sm:text-xl text-blue-100 md:mt-8 md:max-w-3xl"
          >
            這是一個專為學生設計的學習路徑引導平台。探索系所課程結構，規劃您的每學期課表，掌握學習進度，成就未來的專業發展。
          </motion.p>

          <motion.div
             initial={{ y: 20, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             transition={{ delay: 0.6, duration: 0.6 }}
             className="mt-10 max-w-sm mx-auto sm:max-w-none sm:flex sm:justify-center"
          >
            {!isLoggedIn ? (
                <Link
                    to="/login"
                    className="flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-full text-blue-700 bg-yellow-400 hover:bg-yellow-300 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 md:py-4 md:text-lg md:px-10"
                >
                    <KeyIcon className="h-6 w-6 mr-2" />
                    立即登入開始使用
                </Link>
            ) : (
                <Link
                    to="/planning"
                    className="flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-full text-blue-700 bg-yellow-400 hover:bg-yellow-300 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 md:py-4 md:text-lg md:px-10"
                >
                    <CalendarDaysIcon className="h-6 w-6 mr-2" />
                    查看我的課程規劃
                </Link>
            )}
          </motion.div>
        </div>
      </div>

      {/* ==========================
          Features Section (功能入口區)
      ========================== */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
      >
        <div className="text-center mb-12">
          <h2 className="text-base font-semibold text-blue-600 tracking-wide uppercase">核心功能</h2>
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            探索您的學習旅程
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* 卡片 1: 學程地圖 */}
          <FeatureCard
            to="/curriculum"
            icon={<MapIcon className="h-10 w-10 text-white" />}
            title="學程地圖總覽"
            description="以視覺化方式瀏覽系所的課程結構、先修關係與學分要求，掌握整體學習脈絡。"
            color="bg-indigo-500"
            delay={0.2}
          />

          {/* 卡片 2: 課程規劃 */}
          <FeatureCard
            to="/planning"
            icon={<CalendarDaysIcon className="h-10 w-10 text-white" />}
            title="個人課程規劃"
            description="將感興趣的課程安排到未來的學期中，建立專屬於您的修課計畫表。"
            color="bg-pink-500"
            delay={0.4}
          />

          {/* 卡片 3: 個人檔案 (動態) */}
          <FeatureCard
            to={isLoggedIn ? "/profile" : "/login"}
            icon={isLoggedIn ? <UserCircleIcon className="h-10 w-10 text-white" /> : <KeyIcon className="h-10 w-10 text-white" />}
            title={isLoggedIn ? "個人檔案管理" : "帳號登入"}
            description={isLoggedIn ? "管理您的個人資料、修改密碼，並查看您的帳號狀態。" : "登入系統以存取課程規劃、個人化設定等完整功能。"}
            color={isLoggedIn ? "bg-blue-500" : "bg-gray-600"}
            delay={0.6}
          />
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 py-8 text-center">
        <p className="text-sm">© 2025 學程地圖系統. All rights reserved.</p>
        <p className="text-sm">Made by HY Media · 幽魂工作室</p>
      </footer>
    </div>
  );
}

// 輔助元件：功能卡片
function FeatureCard({ to, icon, title, description, color, delay }) {
    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.5, delay } }
    };

    return (
        <motion.div variants={itemVariants} className="h-full">
            <Link
                to={to}
                className="block h-full bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden group relative"
            >
                <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color.replace('bg-', 'text-')}`}>
                    <svg className="h-24 w-24" fill="currentColor" viewBox="0 0 24 24">{icon.props.children}</svg>
                </div>
                <div className="p-8">
                    <div className={`inline-flex items-center justify-center p-3 ${color} rounded-xl shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300`}>
                        {icon}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                        {title}
                    </h3>
                    <p className="text-gray-500 text-base leading-relaxed mb-6">
                        {description}
                    </p>
                    <div className="flex items-center text-blue-600 font-medium group-hover:text-blue-800">
                        前往查看 <ArrowRightIcon className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}