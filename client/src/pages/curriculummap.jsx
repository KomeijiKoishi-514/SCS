// client/src/pages/CurriculumMap.jsx

import React, { useEffect, useState, useCallback, memo, useRef, useMemo } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Handle,
  Position,
  NodeToolbar,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from "reactflow";
import FlowErrorBoundary from "../components/FlowErrorBoundary";
import { motion, AnimatePresence } from "framer-motion";
import "reactflow/dist/style.css";
import api from "../api/axiosConfig";
import html2canvas from "html2canvas";
import ExportMapTemplate from "../components/ExportMapTemplate";
import toast from "react-hot-toast"; 
import { useNavigate } from "react-router-dom";
import { 
  CheckCircleIcon, 
  ClockIcon, 
  InformationCircleIcon, 
  ArrowRightIcon, 
  AcademicCapIcon, 
  CursorArrowRaysIcon, 
  ArrowDownIcon, 
  XCircleIcon
} from "@heroicons/react/24/solid";

// =========================================================
// 1. 輔助函式：分類顏色與權重
// =========================================================
function categoryColor(cat) {
  if (!cat) return "#6b7280";
  if (cat.includes("校定必修")) return "#ef4444";
  if (cat.includes("院定必修")) return "#f59e0b";
  if (cat.includes("系定必修")) return "#10b981";
  if (cat.includes("選修")) return "#3b82f6";
  return "#6b7280";
}

function getCategoryPriority(categories) {
  if (!categories || categories.length === 0) return 99;
  const priorities = categories.map(cat => {
    if (cat.includes("校定必修")) return 1;
    if (cat.includes("院定必修")) return 2;
    if (cat.includes("系定必修")) return 3;
    if (cat.includes("系定選修")) return 4;
    return 10;
  });
  return Math.min(...priorities);
}

// =========================================================
// 2. Custom Node (整合狀態顯示)
// =========================================================
const CustomNode = memo(({ data }) => {
  const course = data.course;
  const firstCat = course.categories?.[0] || null;
  const [isHovered, setIsHovered] = useState(false);

  //  狀態樣式定義
  const getStatusStyle = (status) => {
    switch (status) {
      case 'pass': return { bg: '#10b981', border: '#059669', width: '3px' }; // 綠色
      case 'ing': return { bg: '#f59e0b', border: '#d97706', width: '3px' };  // 黃色
      case 'fail': return { bg: '#ef4444', border: '#b91c1c', width: '3px' }; // 紅色
      default: return { bg: categoryColor(firstCat), border: '#ffffff33', width: '1px' }; // 預設
    }
  };

  const style = getStatusStyle(data.status);

return (
    <div
      className="relative group select-none transition-all duration-300"
      style={{
        width: 200,
        background: style.bg,
        borderColor: style.border,
        borderWidth: style.width,
        boxShadow: data.status ? '0 4px 6px -1px rgba(0, 0, 0, 0.2)' : 'none'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 狀態圖示 (右上角) - 使用 Heroicons */}
      {data.status === 'pass' && (
        <CheckCircleIcon className="absolute -top-3 -right-3 w-7 h-7 text-green-600 bg-white rounded-full shadow-md border-2 border-white z-10" />
      )}
      {data.status === 'ing' && (
        <ClockIcon className="absolute -top-3 -right-3 w-7 h-7 text-yellow-500 bg-white rounded-full shadow-md border-2 border-white z-10" />
      )}
      {data.status === 'fail' && (
        <XCircleIcon className="absolute -top-3 -right-3 w-7 h-7 text-red-600 bg-white rounded-full shadow-md border-2 border-white z-10" />
      )}

      <NodeToolbar isVisible={isHovered} position={Position.Right} offset={10}>
        <div className="bg-white text-black text-sm p-3 rounded shadow-lg w-56 pointer-events-none z-50 border border-gray-200">
          <div className="font-semibold text-base mb-1">{course.course_name}</div>
          <div className="text-gray-700">學分：{course.credits}</div>
          <div className="text-gray-700">時段：{course.year_text}</div>
          <div className="mt-2">
            <div className="text-gray-600 text-sm mb-1">分類：</div>
            <div className="flex flex-wrap gap-1">
              {(course.categories || []).map((cat, i) => (
                <span key={i} className="px-2 py-1 rounded text-xs text-white" style={{ background: categoryColor(cat) }}>{cat}</span>
              ))}
            </div>
          </div>
          {/* Tooltip 提示 - 使用 CursorArrowRaysIcon */}
          <div className="mt-2 text-xs text-gray-400 italic pt-2 border-t text-right font-bold flex items-center justify-end gap-1">
            <CursorArrowRaysIcon className="w-4 h-4" /> 右鍵點擊可修改狀態
          </div>
        </div>
      </NodeToolbar>

      {/* ... (下方的課程名稱區塊保持不變) ... */}
      <div className="rounded-lg shadow-md text-white px-3 py-2 cursor-pointer border hover:scale-105 transition-transform"
        style={{ borderColor: "#ffffff33" }}>
        <div className="font-semibold">{course.course_name}</div>
        <div className="text-sm opacity-90">{course.credits} 學分</div>
        <div className="flex flex-wrap gap-1 mt-1">
          {(course.categories || []).map((cat, i) => (
            <span key={i} className="px-1 py-[2px] rounded text-xs" style={{ background: "#ffffff33", border: "1px solid rgba(255,255,255,0.4)" }}>{cat}</span>
          ))}
        </div>
      </div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

// =========================================================
// 3. 進度條元件 (用於學分試算)
// =========================================================
const ProgressBar = ({ label, current, total, color }) => {
    const percent = Math.min((current / total) * 100, 100);
    return (
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1 font-medium text-gray-600">
          <span>{label}</span>
          <span>{current} / {total}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ease-out ${color}`} style={{ width: `${percent}%` }}></div>
        </div>
      </div>
    );
};
// =========================================================
// 4. 主組件 CurriculumMap
// =========================================================
export default function CurriculumMap() {
  const [depts, setDepts] = useState([]);
  const [deptId, setDeptId] = useState(510);
  
  // 使用 ReactFlow 的 Hook 來管理狀態，方便更新
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  //  該分類課程
  const [rawCourses, setRawCourses] = useState([]);
  //  全課程紀錄
  const [allCourses, setAllCourses] = useState([]);
  //  選擇
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isInfoPanelCollapsed, setIsInfoPanelCollapsed] = useState(true);
  const exportRef = useRef();
  const [isExporting, setIsExporting] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const navigate = useNavigate(); // 2. 初始化 hook

  // 修課紀錄狀態 Map { course_id: 'pass' | 'ing' }
  const [recordMap, setRecordMap] = useState({});
  //  新增：右鍵選單狀態 { id: node.id, top: y, left: x, data: node.data }
  const [contextMenu, setContextMenu] = useState(null);

  const nodeTypes = useMemo(() => ({ customNode: CustomNode }), []);

  // 關閉導覽與選單
  const handleInteraction = useCallback(() => {
    if (showGuide) setShowGuide(false);
    if (contextMenu) setContextMenu(null); // 點擊其他地方時關閉選單
  }, [showGuide, contextMenu]);

  // 修正：使用 useCallback 且用 functional update 避免閉包陷阱
  const toggleInfoPanel = useCallback(() => {
    setIsInfoPanelCollapsed((prev) => !prev);
  }, []);

  // 初始化載入系所
  useEffect(() => {
    api.get("/departments").then((res) => setDepts(res.data || []));
  }, []);

  //  核心資料載入 (課程 + 紀錄)
  const fetchCurriculum = useCallback(async () => {
    if (!deptId) return;
    setLoading(true);
    try {
      // 同時載入課程資料與修課紀錄
      const [currRes, recRes, allCoursesRes] = await Promise.all([
        api.get(`/curriculum/${deptId}`),
        api.get("/records").catch(() => ({ data: {} })), // 如果沒登入或失敗，回傳空物件
        api.get("/courses") // 沒有帶 dept_id 就會回傳全校課程的 API
      ]);

      const { courses, prerequisites } = currRes.data;
      const records = recRes.data; // { 101: 'pass', ... }
      const globalCourses = allCoursesRes.data; // 全校課程清單

      setRawCourses(courses);
      setRecordMap(records);
      setAllCourses(globalCourses);

      // --- Layout 計算 (Grid System) ---
      const groups = {};
      courses.forEach((c) => {
        const rowKey = c.year_level || 999;
        if (!groups[rowKey]) groups[rowKey] = [];
        groups[rowKey].push(c);
      });

      const sortedYears = Object.keys(groups).map(Number).sort((a, b) => a - b);
      
      let maxP1 = 0, maxP2 = 0, maxP3 = 0;
      sortedYears.forEach((year) => {
        const rowCourses = groups[year];
        maxP1 = Math.max(maxP1, rowCourses.filter(c => getCategoryPriority(c.categories) === 1).length);
        maxP2 = Math.max(maxP2, rowCourses.filter(c => getCategoryPriority(c.categories) === 2).length);
        maxP3 = Math.max(maxP3, rowCourses.filter(c => getCategoryPriority(c.categories) === 3).length);
      });

      const H_GAP = 260; 
      const V_GAP = 180;
      const startX_P1 = 0;
      const startX_P2 = maxP1 * H_GAP;
      const startX_P3 = (maxP1 + maxP2) * H_GAP;
      const startX_P4 = (maxP1 + maxP2 + maxP3) * H_GAP;

      const nodeList = [];
      sortedYears.forEach((year, rowIndex) => {
        const rowCourses = groups[year];
        let currentP1 = 0, currentP2 = 0, currentP3 = 0, currentP4 = 0;

        rowCourses.sort((a, b) => {
          const pA = getCategoryPriority(a.categories);
          const pB = getCategoryPriority(b.categories);
          if (pA !== pB) return pA - pB;
          if (a.dept_id !== b.dept_id) return a.dept_id - b.dept_id;
          return a.course_id - b.course_id;
        });

        rowCourses.forEach((c) => {
          const priority = getCategoryPriority(c.categories);
          let posX = 0;
          if (priority === 1) { posX = startX_P1 + (currentP1 * H_GAP); currentP1++; }
          else if (priority === 2) { posX = startX_P2 + (currentP2 * H_GAP); currentP2++; }
          else if (priority === 3) { posX = startX_P3 + (currentP3 * H_GAP); currentP3++; }
          else { posX = startX_P4 + (currentP4 * H_GAP); currentP4++; }

          nodeList.push({
            id: String(c.course_id),
            type: "customNode",
            //  將 status 注入 node data
            data: { course: c, status: records[c.course_id] },
            position: { x: posX, y: rowIndex * V_GAP },
          });
        });
      });

      const edgeList = prerequisites.map((p) => ({
         id: `e${p.prereq_id}-${p.course_id}`,
         source: String(p.prereq_id),
         target: String(p.course_id),
         animated: true,
         type: "smoothstep",
         style: { stroke: '#b1b1b7', strokeWidth: 1 }, // 預設樣式
      }));

      setNodes(nodeList);
      setEdges(edgeList);
    } catch (error) { 
        console.error(error); 
    } finally { 
        setLoading(false); 
    }
  }, [deptId, setNodes, setEdges]);

  useEffect(() => { fetchCurriculum(); }, [fetchCurriculum]);

  // =========================================================
  // 5. 擋修檢查函式
  // =========================================================
  const checkPrerequisites = (courseId) => {
    // 找出這門課的所有「直接先修課」(Edges 指向這個 node 的線)
    const prereqEdges = edges.filter(e => e.target === String(courseId));
    
    const missingPrereqs = [];
    
    prereqEdges.forEach(edge => {
      const prereqId = edge.source;
      // 檢查先修課是否已通過
      if (recordMap[prereqId] !== 'pass') {
        const prereqCourse = rawCourses.find(c => String(c.course_id) === prereqId);
        missingPrereqs.push({ id: prereqId, name: prereqCourse?.course_name });
      }
    });

    return missingPrereqs;
  };

  // =========================================================
  // 6. 節點操作處理
  // =========================================================
  
  // 左鍵點擊：只處理選取與資訊欄
  const onNodeClick = useCallback((e, node) => {
    handleInteraction();
    const clickedCourse = node.data.course;
    if (selectedCourse && selectedCourse.course_id === clickedCourse.course_id) {
        toggleInfoPanel();
    } else {
        setSelectedCourse(clickedCourse);
        setIsInfoPanelCollapsed(false);
    }
  }, [handleInteraction, selectedCourse, toggleInfoPanel]); // 加入 toggleInfoPanel 依賴

  //  右鍵點擊：開啟選單
  const onNodeContextMenu = useCallback(
    (event, node) => {
      event.preventDefault(); // 阻止瀏覽器預設選單
      
      // 記錄位置與目標課程
      setContextMenu({
        id: node.id,
        top: event.clientY,
        left: event.clientX,
        data: node.data,
      });
    },
    [setContextMenu]
  );

  //  選單點擊：執行狀態變更
  const handleMenuClick = async (status) => {
    if (!contextMenu) return;
    
    if (!localStorage.getItem("auth_token")) {
        toast.error("請先登入以使用此功能");
        setContextMenu(null);
        return;
    }

    const courseId = contextMenu.data.course.course_id;
    const nextStatus = status; // 'none', 'ing', 'pass'

    // 擋修偵測 (當嘗試變成 ing 或 pass 時)
    if (nextStatus !== 'none') {
        const missing = checkPrerequisites(courseId);
        if (missing.length > 0) {
            toast.error(`警告！您尚未通過先修課程：${missing.map(m => m.name).join(', ')}`);
            
            // 視覺效果：把衝突的路徑變紅
            setEdges(eds => eds.map(edge => {
                if (edge.target === String(courseId) && missing.some(m => String(m.id) === edge.source)) {
                    return { ...edge, style: { stroke: '#ef4444', strokeWidth: 3 }, animated: false }; 
                }
                return { ...edge, style: { stroke: '#b1b1b7', strokeWidth: 1 }, animated: true };
            }));
            
            setTimeout(() => {
                setEdges(eds => eds.map(edge => ({ ...edge, style: { stroke: '#b1b1b7', strokeWidth: 1 }, animated: true })));
            }, 1500);

            setContextMenu(null); // 關閉選單
            return; // 阻止切換
        }
    }

    // 呼叫 API 更新
    try {
        await api.post("/records", { course_id: courseId, status: nextStatus === 'none' ? 'none' : nextStatus });
        
        const newStatus = nextStatus === 'none' ? undefined : nextStatus;
        
        // 更新本地 State
        setRecordMap(prev => ({ ...prev, [courseId]: newStatus }));
        
        // 更新 Node 顯示
        setNodes(nds => nds.map(n => {
            if (n.id === String(courseId)) {
                return { ...n, data: { ...n.data, status: newStatus } };
            }
            return n;
        }));

        // 成功提示 (可選，避免太頻繁)
        // toast.success("狀態更新");

    } catch (err) {
        console.error(err);
        toast.error("更新失敗");
    } finally {
        setContextMenu(null); // 關閉選單
    }
  };


// =========================================================
// 7. 學分試算 - 終極 Debug 監視器版本
// =========================================================
  const creditStats = useMemo(() => {
    let stats = {
      total: { current: 0, total: 128 },
      schoolRequired: { current: 0, total: 18 },
      freeElective: { current: 0, total: 10 },
      collegeRequired: { current: 0, total: 8 },
      deptRequired: { current: 0, total: 54 },
      groupRequired: { current: 0, total: 0 },
      electiveTotal: { current: 0, total: 38 },
      deptElective: { current: 0, total: 30 }
    };

    console.log("================ 🚀 🎓 啟動學分計算引擎 ================");
  
    allCourses.forEach(c => {
      // 1. 只有當狀態為 'pass' 時才計算
      if (recordMap[c.course_id] === 'pass') {
        const credits = Number(c.credits) || 0;
        stats.total.current += credits;
  
        console.log(`\n🔍 正在處理: [${c.course_name}] (課程ID: ${c.course_id}, 學分: ${credits})`);
        console.log(`   ➤ 後端給的 category_ids 原始值:`, c.category_ids, `(型別: ${typeof c.category_ids})`);
        console.log(`   ➤ 後端給的 categories (中文) 原始值:`, c.categories);

        // 2. 解析陣列
        let catIds = [];
        if (Array.isArray(c.category_ids)) {
            catIds = c.category_ids;
            console.log(`   ➤ 判斷為: 標準陣列`);
        } else if (typeof c.category_ids === 'string') {
            catIds = c.category_ids.replace(/[{}[\]\s]/g, '').split(',').filter(Boolean);
            console.log(`   ➤ 判斷為: 字串，清理並切割後得到陣列 ->`, catIds);
        } else {
            console.log(`   ⚠️ 警告: category_ids 是 undefined 或未知型別！`);
        }
        
        // 3. 進入分類計算
        if (catIds.length > 0) {
            catIds.forEach(id => {
                const catId = Number(id);
                console.log(`   🎯 準備配對 ID: ${catId} (原始字元: '${id}')`);

                switch (catId) {
                    case 1:
                        console.log(`      ✅ 成功配對: [系定必修] (+${credits} 學分)`);
                        stats.deptRequired.current += credits;
                        break;
                    case 2:
                        console.log(`      ✅ 成功配對: [系上選修] (+${credits} 學分, 同時計入總選修)`);
                        stats.deptElective.current += credits;
                        stats.electiveTotal.current += credits;
                        break;
                    case 3:
                        console.log(`      ✅ 成功配對: [校定必修] (+${credits} 學分)`);
                        stats.schoolRequired.current += credits;
                        break;
                    case 4:
                        console.log(`      ✅ 成功配對: [院定必修] (+${credits} 學分)`);
                        stats.collegeRequired.current += credits;
                        break;
                    case 5:
                        console.log(`      ✅ 成功配對: [通識選修] (+${credits} 學分)`);
                        stats.freeElective.current += credits;
                        break;
                    default:
                        console.log(`      ❌ 失敗: 找不到對應的 ID (${catId})，被丟進選修池`);
                        if (catId && !isNaN(catId)) {
                             stats.electiveTotal.current += credits;
                        }
                        break;
                }
            });
        } else {
            console.log(`   ⚠️ 這門課沒有任何有效的 category_ids！`);
            if (!c.type?.includes('必修')) {
                 console.log(`      ➔ 且 type 不是必修課，被丟進選修池 (+${credits} 學分)`);
                 stats.electiveTotal.current += credits;
            } else {
                 console.log(`      ➔ 但 type 是必修，忽略不計入選修`);
            }
        }
      }
    });
    
    console.log("================ 🏁 學分計算結束 ================", stats);
    return stats;
  }, [allCourses, recordMap]);

  // 匯出相關
  const exportCategories = useMemo(() => {
    const uniqueCats = new Set();
    rawCourses.forEach(c => {
      if (Array.isArray(c.categories)) c.categories.forEach(cat => uniqueCats.add(cat));
      else if (c.category) uniqueCats.add(c.category);
    });
    const sorted = Array.from(uniqueCats).sort((a, b) => getCategoryPriority([a]) - getCategoryPriority([b]));
    return sorted.map(cat => ({ id: cat, name: cat }));
  }, [rawCourses]);

  {/*const handleExportImage = async () => {
      if (!exportRef.current) return;
      setIsExporting(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        const canvas = await html2canvas(exportRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const image = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = image;
        link.download = `學程地圖_${deptId}_${new Date().getTime()}.png`;
        link.click();
      } catch (err) { alert("匯出失敗"); } finally { setIsExporting(false); }
  };*/}
  const handleExportClick = () => {
    navigate(`/curriculum/export/${deptId}`);
  };


  return (
    <div className="flex h-full bg-gray-100 overflow-hidden relative">
      
      {/* 左側與中間內容 */}
      <div className="flex-1 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <select className="border p-2 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-bold text-blue-900" value={deptId} onChange={(e) => setDeptId(e.target.value)}>
              {depts.map((d) => (<option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>))}
            </select>
            <button 
            onClick={handleExportClick} 
            className="px-4 py-2 rounded text-white shadow-sm transition-colors bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
            >
             <span>匯出預覽</span>
            </button>
            {/* <button onClick={handleExportImage} disabled={isExporting || loading} className={`px-4 py-2 rounded text-white shadow-sm transition-colors ${isExporting ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
              {isExporting ? "處理中..." : "匯出圖片 (PNG)"}
            </button> */}
          </div>
        </div>

        <div className="relative bg-white rounded shadow flex-1 overflow-hidden">
          <ReactFlowProvider>
            <FlowErrorBoundary>
                <div className="flex-1 h-full relative" onClick={handleInteraction}>
                    <AnimatePresence>
                    {loading && (<motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex justify-center items-center bg-white/80 z-10 backdrop-blur-sm"><div className="text-lg font-bold text-blue-600 animate-pulse">載入中…</div></motion.div>)}
                    </AnimatePresence>
                    
                    <AnimatePresence>
                    {showGuide && (
                        <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/40 backdrop-blur-[3px]"
                        >
                          <div className="flex flex-col items-center space-y-8 pointer-events-auto">
                            <div className="bg-white/95 px-6 py-3 rounded-full shadow-2xl border-2 border-blue-400 mb-2 animate-bounce">
                                <p className="text-blue-800 font-bold text-lg flex items-center gap-2">
                                    {/* 替換為 CursorArrowRaysIcon */}
                                    <CursorArrowRaysIcon className="w-6 h-6" />
                                    右鍵點擊課程可切換修課狀態
                                </p>
                            </div>

                            {/* 垂直年級時間軸 */}
                            <div className="relative flex flex-col items-center space-y-8">
                              <div className="absolute top-4 bottom-4 w-1 border-l-4 border-dashed border-white/70 -z-10 h-full"></div>
                              {["校定必修", "院定必修", "系定必修", "系上選修"].map((year, idx) => (
                                  <div key={year} className="flex items-center space-x-4">
                                      <div className={`px-6 py-2 rounded-xl shadow-lg text-white font-bold text-xl tracking-wider border-2 border-white/20 ${idx === 0 ? "bg-red-500" : idx === 1 ? "bg-orange-400" : idx === 2 ? "bg-green-500" : "bg-blue-500"}`}>
                                          {year}
                                      </div>
                                      {/* 替換為 ArrowDownIcon */}
                                      {idx === 0 && <span className="text-white font-bold drop-shadow-md text-sm bg-black/20 px-2 py-1 rounded flex items-center gap-1">大一 <ArrowDownIcon className="w-3 h-3"/></span>}
                                      {idx === 1 && <span className="text-white font-bold drop-shadow-md text-sm bg-black/20 px-2 py-1 rounded flex items-center gap-1">大二 <ArrowDownIcon className="w-3 h-3"/></span>}
                                      {idx === 2 && <span className="text-white font-bold drop-shadow-md text-sm bg-black/20 px-2 py-1 rounded flex items-center gap-1">大三 <ArrowDownIcon className="w-3 h-3"/></span>}
                                      {idx === 3 && <span className="text-white font-bold drop-shadow-md text-sm bg-black/20 px-2 py-1 rounded">大四</span>}
                                  </div>
                              ))}
                          </div>
                          <p className="text-white/80 text-sm mt-4 font-light">(拖曳畫面或滾動以開始探索)</p>
                        </div>
                        </motion.div>
                    )}
                    </AnimatePresence>

                    <ReactFlow
                        nodes={nodes} edges={edges} nodeTypes={nodeTypes}
                        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                        fitView fitViewOptions={{ padding: 0.1 }} proOptions={{ hideAttribution: true }}
                        onMoveStart={handleInteraction} 
                        onPaneClick={handleInteraction}
                        //  點擊只顯示資訊
                        onNodeClick={onNodeClick} 
                        //  右鍵選單
                        onNodeContextMenu={onNodeContextMenu}
                    >
                        <MiniMap tyle={{ bottom: 20, right: isInfoPanelCollapsed ? 20 : 340, transition: 'right 0.3s' }}/>
                        <Controls 
                          className="react-flow__controls-override"
                          style={{
                            display: 'flex',
                            flexDirection: 'column', // 確保按鈕是直排
                            width: 'fit-content',
                            height: 'fit-content',
                            minWidth: '32px',         // 給一個最小寬度，避免按鈕太擠
    
                            position: 'absolute',
                            bottom: 100, 
                            right: isInfoPanelCollapsed ? 20 : 340, 
                            transition: 'right 0.3s',
    
                            // 外觀設定
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            padding: '4px',           // 內距，讓按鈕不要貼死邊框
                            zIndex: 10                // 確保浮在地圖之上
                          }} 
                          showInteractive={false} 
                        />
                    </ReactFlow>

                    {/*  右鍵選單 (Context Menu Overlay) */}
                    <AnimatePresence>
                      {contextMenu && (
                        <motion.div
                          key="context-menu" // 必要的 key，讓 AnimatePresence 識別元件
                          initial={{ opacity: 0, scale: 0.9, transformOrigin: "top left" }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
                          transition={{ type: "spring", stiffness: 300, damping: 20, duration: 0.2 }}
                          style={{
                            top: contextMenu.top,
                            left: contextMenu.left,
                          }}
                          // 注意：我移除了原本的 'animate-fade-in' class，避免動畫衝突
                          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-1 w-48 text-sm font-medium overflow-hidden"
                        >
                          <div className="px-4 py-2 border-b bg-gray-50 text-gray-500 text-xs font-bold">
                            {contextMenu.data.course.course_name}
                          </div>
                          <button
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 flex items-center transition-colors"
                            onClick={() => handleMenuClick('none')}
                          >
                            <span className="w-3 h-3 mr-3 border-2 border-gray-400 rounded-full"></span>
                            設為未修
                          </button>
                          <button
                            className="w-full text-left px-4 py-2 hover:bg-yellow-50 text-yellow-700 flex items-center transition-colors"
                            onClick={() => handleMenuClick('ing')}
                          >
                            <span className="w-3 h-3 mr-3 bg-yellow-400 rounded-full ring-2 ring-yellow-200"></span>
                            修課中...
                          </button>
                          <button
                            className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-700 flex items-center transition-colors"
                            onClick={() => handleMenuClick('fail')}
                          >
                            <span className="w-3 h-3 mr-3 bg-red-500 rounded-full ring-2 ring-red-200"></span>
                            未通過
                          </button>
                          <button
                            className="w-full text-left px-4 py-2 hover:bg-green-50 text-green-700 flex items-center transition-colors"
                            onClick={() => handleMenuClick('pass')}
                          >
                            <span className="w-3 h-3 mr-3 bg-green-500 rounded-full ring-2 ring-green-200"></span>
                            已通過
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                </div>
            </FlowErrorBoundary>
          </ReactFlowProvider>
        </div>
      </div>

      {/* 右側：資訊面板 */}
      <motion.div
        initial={false}
        animate={{ width: isInfoPanelCollapsed ? 64 : 384 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        //  關鍵修正 1: 加入 overflow-hidden 防止內容在縮放時溢出
        className="bg-white border-l shadow-lg z-20 flex flex-col h-full flex-shrink-0 overflow-hidden"
      >
        <button
          onClick={toggleInfoPanel}
          className="relative w-full h-16 border-b hover:bg-gray-50 focus:outline-none flex items-center justify-center overflow-hidden transition-colors"
        >
          <AnimatePresence mode="wait">
            {isInfoPanelCollapsed ? (
              // 狀態 A: 收縮時顯示 Icon
              <motion.div
                key="icon"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                {/* 替換為 InformationCircleIcon */}
                <InformationCircleIcon className="w-8 h-8 text-blue-600" />
              </motion.div>
            ) : (
              // 狀態 B: 展開時顯示文字
              <motion.div
                key="text"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="flex items-center w-full px-4 whitespace-nowrap"
              >
                <span className="font-bold text-gray-700 text-lg flex-1 text-left pl-2">
                  詳細資訊 & 進度
                </span>
                {/* 替換為 ArrowRightIcon */}
                <ArrowRightIcon className="w-5 h-5 text-gray-400" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* 內容區域：加入動畫讓它在收縮時優雅消失，而不是直接被切掉 */}
        <motion.div
          animate={{ opacity: isInfoPanelCollapsed ? 0 : 1 }}
          transition={{ duration: 0.2 }}
          className={`overflow-y-auto overflow-x-hidden flex-1 p-4 ${
            isInfoPanelCollapsed ? "pointer-events-none" : ""
          }`}
        >
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-6">
            <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
              <AcademicCapIcon className="w-6 h-6 text-blue-600" />
              畢業門檻審查
            </h3>
            
            <ProgressBar label="畢業總學分" current={creditStats.total.current} total={creditStats.total.total} color="bg-green-600" />
            
            <hr className="my-3 border-gray-300 border-dashed" />
            
            <ProgressBar label="校定必修" current={creditStats.schoolRequired.current} total={creditStats.schoolRequired.total} color="bg-red-500" />
            <ProgressBar label="院定必修" current={creditStats.collegeRequired.current} total={creditStats.collegeRequired.total} color="bg-red-500" />
            <ProgressBar label="系定必修" current={creditStats.deptRequired.current} total={creditStats.deptRequired.total} color="bg-red-500" />
            
            <hr className="my-3 border-gray-300 border-dashed" />
            
            <ProgressBar label="(6) 選修總學分" current={creditStats.electiveTotal.current} total={creditStats.electiveTotal.total} color="bg-blue-500" />
            
            {/* 巢狀縮進：顯示系專選包含在選修總學分內 */}
            <div className="pl-4 mt-1 opacity-90">
              <ProgressBar label="↳ 本系專業選修" current={creditStats.deptElective.current} total={creditStats.deptElective.total} color="bg-indigo-400" />
          </div>

            <ProgressBar label="興趣自選" current={creditStats.freeElective.current} total={creditStats.freeElective.total} color="bg-yellow-500" />
          </div>

          {selectedCourse ? (
            <div className="space-y-4">
              <div
                className="pl-3 border-l-4"
                style={{
                  borderColor: categoryColor(selectedCourse.categories?.[0]),
                }}
              >
                <h2 className="text-xl font-bold text-gray-800">
                  {selectedCourse.course_name}
                </h2>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded text-white inline-block mt-1"
                  style={{
                    background: categoryColor(selectedCourse.categories?.[0]),
                  }}
                >
                  {selectedCourse.categories?.[0] || "未分類"}
                </span>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">學分</span>
                  <span className="font-medium">{selectedCourse.credits}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">年級</span>
                  <span className="font-medium">
                    {selectedCourse.year_text}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">修課狀態</span>
                  <span
                    className={`font-bold ${
                      recordMap[selectedCourse.course_id] === "pass"
                        ? "text-green-600"
                        : recordMap[selectedCourse.course_id] === "ing"
                        ? "text-yellow-600"
                        : "text-gray-400"
                    }`}
                  >
                    {recordMap[selectedCourse.course_id] === "pass"
                      ? "已通過"
                      : recordMap[selectedCourse.course_id] === "ing"
                      ? "修課中"
                      : recordMap[selectedCourse.course_id] === "fail"
                      ? "未通過"
                      : "未修"
                      }
                  </span>
                </div>
              </div>

              <div>
                <div className="text-gray-500 text-sm mb-2">分類標籤：</div>
                <div className="flex flex-wrap gap-2">
                  {(selectedCourse.categories || []).map((cat, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 rounded-full text-xs text-white shadow-sm"
                      style={{ background: categoryColor(cat) }}
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm">
               {/* 可以給這裡加個 Icon */}
              <CursorArrowRaysIcon className="w-8 h-8 text-gray-300 mb-2" />
              <p>點擊課程以查看詳情</p>
            </div>
          )}
        </motion.div>
      </motion.div>

      <div style={{ position: "fixed", top: "-10000px", left: "-10000px", zIndex: -1 }}>
        <ExportMapTemplate ref={exportRef} courses={rawCourses} categories={exportCategories} />
      </div>
    </div>
  );
}