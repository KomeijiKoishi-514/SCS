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
import { 
  CheckCircleIcon, 
  ClockIcon, 
  InformationCircleIcon, 
  ArrowRightIcon, 
  AcademicCapIcon, 
  CursorArrowRaysIcon, 
  ArrowDownIcon, 
  XCircleIcon,
  MinusIcon,
  MapIcon,
  ArrowsPointingOutIcon
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
// 自定義元件：可拖曳、可縮小的懸浮地圖 (FloatingMiniMap)
// =========================================================
const FloatingMiniMap = memo(({ nodes }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const dragControls = useDragControls(); //  建立拖曳控制器

  return (
    <motion.div
      drag
      dragListener={false} // 關閉預設的全域拖曳監聽，改由 dragControls 控制
      dragControls={dragControls} // 綁定控制器
      dragMomentum={false}
      initial={{ x: 0, y: 0 }}
      // 確保寬度是固定的 (w-64)，並加入 pointer-events-auto 確保能接收事件
      className="nopan absolute z-50 right-5 bottom-5 flex flex-col items-end shadow-2xl rounded-lg overflow-hidden border border-gray-200 bg-white w-64 pointer-events-auto"
      style={{ 
        height: isMinimized ? 'auto' : 'auto', // 高度自動適應內容
        touchAction: 'none'
      }}
    >
      {/* 標題列 (拖曳手把) */}
      <div 
        // 在這裡綁定拖曳啟動事件 (onPointerDown)
        onPointerDown={(e) => dragControls.start(e)}
        className="w-full h-8 bg-gray-100 border-b border-gray-200 flex items-center justify-between px-3 cursor-move hover:bg-gray-200 transition-colors select-none"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
          <MapIcon className="w-4 h-4 text-gray-500" />
          <span>導覽地圖</span>
        </div>
        
        {/* 縮放按鈕 (要阻止冒泡，避免點按鈕變成拖視窗) */}
        <button
          onPointerDown={(e) => e.stopPropagation()} 
          onClick={(e) => {
             e.stopPropagation(); 
             setIsMinimized(!isMinimized);
          }}
          className="p-0.5 hover:bg-gray-300 rounded text-gray-500 transition-colors focus:outline-none cursor-pointer"
        >
          {isMinimized ? <ArrowsPointingOutIcon className="w-4 h-4" /> : <MinusIcon className="w-4 h-4" />}
        </button>
      </div>

      {/* 地圖本體 */}
      <AnimatePresence mode="wait">
        {!isMinimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 160, opacity: 1 }} // 目標高度
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full bg-white relative"
          >
            {/* 包一層 div 強制給予具體高度，解決 MiniMap 讀不到尺寸變灰色的問題 */}
            <div className="h-40 w-full relative"> 
                <MiniMap 
                  pannable 
                  zoomable
                  style={{ height: '100%', width: '100%' }} // 繼承父層高度
                  nodeColor={(n) => {
                    if (n.data?.status === 'pass') return '#10b981';
                    if (n.data?.status === 'ing') return '#f59e0b';
                    if (n.data?.status === 'fail') return '#ef4444';
                    return '#e5e7eb';
                  }}
                  maskColor="rgba(240, 240, 240, 0.6)" // 讓遮罩顏色淺一點，對比更明顯
                />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

// =========================================================
// 4. 主組件 CurriculumMap
// =========================================================
export default function CurriculumMap() {
  const [depts, setDepts] = useState([]);
  const [deptId, setDeptId] = useState(510);
  
  // 使用 ReactFlow 的 Hook 來管理狀態，方便更新
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [rawCourses, setRawCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isInfoPanelCollapsed, setIsInfoPanelCollapsed] = useState(true);
  const exportRef = useRef();
  const [isExporting, setIsExporting] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

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
      const [currRes, recRes] = await Promise.all([
        api.get(`/curriculum/${deptId}`),
        api.get("/records").catch(() => ({ data: {} })) // 如果沒登入或失敗，回傳空物件
      ]);

      const { courses, prerequisites } = currRes.data;
      const records = recRes.data; // { 101: 'pass', ... }

      setRawCourses(courses);
      setRecordMap(records);

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
            toast.error(`擋修警告！您尚未通過先修課程：${missing.map(m => m.name).join(', ')}`);
            
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
  // 7. 學分試算 (計算屬性) - 修正判斷邏輯 (雙重檢查)
  // =========================================================
  const creditStats = useMemo(() => {
    let stats = {
      compulsory: { current: 0, total: 60 }, 
      elective: { current: 0, total: 30 },
      general: { current: 0, total: 28 },
      total: { current: 0, total: 128 }
    };
  
    rawCourses.forEach(c => {
      // 1. 只有當狀態為 'pass' (已通過) 時才計算學分
      if (recordMap[c.course_id] === 'pass') {
        const credits = Number(c.credits);
        stats.total.current += credits;
  
        // 只要任一來源包含「必修」二字，就視為必修
        const categories = Array.isArray(c.categories) ? c.categories : [];
        const isCompulsory = categories.some(cat => cat.includes('必修')) || (c.type && c.type.includes('必修'));
        
        // 同理，檢查是否為通識
        const isGeneral = categories.some(cat => cat.includes('通識')) || (c.type && c.type.includes('通識'));

        if (isCompulsory) {
            stats.compulsory.current += credits;
        } 
        else if (isGeneral) {
            stats.general.current += credits;
        } 
        else {
            // 既不是必修也不是通識，就歸類為選修
            stats.elective.current += credits;
        }
      }
    });
    return stats;
  }, [rawCourses, recordMap]);

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

  const handleExportImage = async () => {
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
            <button onClick={handleExportImage} disabled={isExporting || loading} className={`px-4 py-2 rounded text-white shadow-sm transition-colors ${isExporting ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
              {isExporting ? "處理中..." : "匯出圖片 (PNG)"}
            </button>
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
                        <MiniMap style={{ bottom: 20, right: isInfoPanelCollapsed ? 20 : 340, transition: 'right 0.3s' }}/>
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
              {/* 替換為 AcademicCapIcon */}
              <AcademicCapIcon className="w-6 h-6 text-blue-600" />
              畢業進度試算
            </h3>
            {/* ... ProgressBar 們保持不變 ... */}
            <ProgressBar label="必修學分" current={creditStats.compulsory.current} total={creditStats.compulsory.total} color="bg-red-500" />
            <ProgressBar label="選修學分" current={creditStats.elective.current} total={creditStats.elective.total} color="bg-blue-500" />
            <ProgressBar label="總學分" current={creditStats.total.current} total={creditStats.total.total} color="bg-green-600" />
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