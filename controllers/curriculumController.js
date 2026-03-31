import pool from "../config/db.js";

export async function getCurriculumByDept(req, res) {
  try {
    const deptId = req.params.dept_id;
    /* 轉換對應編號到特定學年。 */
    function convertYearText(level) {
      const map = {
        1: "一年級上",
        2: "一年級下",
        3: "二年級上",
        4: "二年級下",
        5: "三年級上",
        6: "三年級下",
        7: "四年級上",
        8: "四年級下",
      };
      return map[level] || "未指定";
    }

    // 💡 修改 1：在 SELECT 中補上 c.type，這樣前端才能判斷是不是必修課
    const courseQuery = `
      SELECT c.course_id, c.course_name, c.credits, c.year_level, c.semester, c.type
      FROM courses c 
      WHERE c.dept_id = $1 OR c.dept_id = 0
      ORDER BY c.year_level ASC;
    `;

    const prereqQuery = `
      SELECT course_id, prereq_id 
      FROM course_prerequisite;
    `;

    // 💡 修改 2：在 SELECT 中多要一個 ccm.category_id
    const categoriesQuery = `
      SELECT ccm.course_id, cat.category_name, ccm.category_id
      FROM course_category_map ccm
      JOIN categories cat ON ccm.category_id = cat.category_id;
    `;

    const [courses, prerequisites, categories] = await Promise.all([
      pool.query(courseQuery, [deptId]),
      pool.query(prereqQuery),
      pool.query(categoriesQuery),
    ]);

    // course_id → course info
    const courseMap = {};

    // 💡 修改 3：初始化時，準備好 category_ids 陣列，並存入 type
    courses.rows.forEach((c) => {
      courseMap[c.course_id] = {
        course_id: c.course_id,
        course_name: c.course_name,
        credits: c.credits,
        year_level: c.year_level,
        year_text: convertYearText(c.year_level), // 新增中文年級
        semester: c.semester,
        type: c.type, // 把 type 傳給前端
        categories: [],
        category_ids: [], // 準備用來裝數字 ID 的陣列
      };
    });

    // 💡 修改 4：把撈到的數字 ID 也塞進陣列裡
    categories.rows.forEach((cat) => {
      if (courseMap[cat.course_id]) {
        courseMap[cat.course_id].categories.push(cat.category_name);
        courseMap[cat.course_id].category_ids.push(cat.category_id); // 數字 ID 正式上車！
      }
    });

    // 正確回傳方式（前端才能收到）
    res.json({
      courses: Object.values(courseMap),   // NOT courses.rows !!!
      prerequisites: prerequisites.rows,
    });

  } catch (err) {
    res.status(500).json({
      message: "伺服器錯誤",
      error: err.message,
    });
  }
}