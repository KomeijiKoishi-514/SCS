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
  
    rawCourses.forEach(c => {
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
  }, [rawCourses, recordMap]);