// controllers/courseController.js
import pool from "../config/db.js";

/* ============================================
   取得課程列表（支援 ?dept_id=510 篩選）
   🔥 修改：加入 module_ids 的查詢
============================================ */
export const getCourses = async (req, res) => {
  try {
    // 1. 接收前端傳來的 query parameters
    const { dept_id } = req.query;
    
    // 2. 準備 SQL 參數與 WHERE 子句
    const values = [];
    let whereClause = "";

    // 如果前端有傳 dept_id (例如 510 或 0)，就加上篩選條件
    if (dept_id !== undefined && dept_id !== null && dept_id !== "") {
      whereClause = "WHERE c.dept_id = $1";
      values.push(dept_id);
    }

    // 3. 組合 SQL
const query = `
      SELECT 
        c.course_id,
        c.course_name,
        c.credits,
        c.semester,
        c.type,
        c.year_level,
        c.dept_id,
        CASE
          WHEN c.year_level = 1 THEN '一年級上'
          WHEN c.year_level = 2 THEN '一年級下'
          WHEN c.year_level = 3 THEN '二年級上'
          WHEN c.year_level = 4 THEN '二年級下'
          WHEN c.year_level = 5 THEN '三年級上'
          WHEN c.year_level = 6 THEN '三年級下'
          WHEN c.year_level = 7 THEN '四年級上'
          WHEN c.year_level = 8 THEN '四年級下'
          ELSE '未指定'
        END AS year_text,
        COALESCE(
          ARRAY(
            SELECT cc.category_name
            FROM course_category_map m
            JOIN categories cc 
                ON cc.category_id = m.category_id
            WHERE m.course_id = c.course_id
          ),
        '{}') AS categories,

        COALESCE(
          ARRAY(
            SELECT m.category_id
            FROM course_category_map m
            WHERE m.course_id = c.course_id
          ),
        '{}') AS category_ids,

        COALESCE(
          ARRAY(
            SELECT mc.module_id
            FROM module_courses mc
            WHERE mc.course_id = c.course_id
          ),
        '{}') AS module_ids
      FROM courses c
      ${whereClause}
      ORDER BY c.course_id DESC;
    `;

    const result = await pool.query(query, values);

    res.json(result.rows);
  } catch (err) {
    console.error("無法取得課程:", err);
    res.status(500).json({ message: "伺服器錯誤", error: err.message });
  }
};

/* ============================================
   新增課程（含分類 + 先修 + 模組）
   🔥 修改：處理 module_ids
============================================ */
export const createCourse = async (req, res) => {
  try {
    const {
      course_name,
      credits,
      semester,
      type,
      categories = [],
      year_level,
      dept_id,
      prerequisite_ids = [], // 接收前端傳來的先修課 ID 陣列
      module_ids = []        // 🔥 接收前端傳來的模組 ID 陣列
    } = req.body;

    if (!course_name || !credits || !year_level) {
      return res.status(400).json({ message: "缺少必要欄位" });
    }

    // 1. 新增課程本體
    const courseRes = await pool.query(
      `INSERT INTO courses (course_name, credits, semester, type, year_level, dept_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING course_id`,
      [course_name, credits, semester, type, year_level, dept_id]
    );
    const courseId = courseRes.rows[0].course_id;

    // 2. 處理分類 (維持原樣)
    const catRes = await pool.query(
      `SELECT category_id FROM categories WHERE category_name = ANY($1)`,
      [categories]
    );
    for (const cat of catRes.rows) {
      await pool.query(
        `INSERT INTO course_category_map (course_id, category_id) VALUES ($1, $2)`,
        [courseId, cat.category_id]
      );
    }

    // 3. 處理先修課程關聯
    if (prerequisite_ids.length > 0) {
      for (const prereqId of prerequisite_ids) {
        await pool.query(
          `INSERT INTO course_prerequisite (course_id, prereq_id) VALUES ($1, $2)`,
          [courseId, prereqId]
        );
      }
    }

    // 4. 🔥 新增：處理模組關聯 (module_courses)
    if (module_ids.length > 0) {
      for (const modId of module_ids) {
        await pool.query(
          `INSERT INTO module_courses (module_id, course_id) VALUES ($1, $2)`,
          [modId, courseId]
        );
      }
    }

    res.json({ message: "新增課程成功", course_id: courseId });

  } catch (err) {
    console.error("新增錯誤:", err);
    res.status(500).json({ message: "伺服器錯誤", error: err.message });
  }
};

/* ============================================
   更新課程（含分類 + 先修 + 模組）
   修改：處理 module_ids 更新
============================================ */
export const updateCourse = async (req, res) => {
  try {
    const id = req.params.id;
    const {
      course_name,
      credits,
      semester,
      type,
      categories = [],
      year_level,
      dept_id,
      prerequisite_ids = [], // 接收先修課 ID
      module_ids = []        // 接收模組 ID
    } = req.body;

    // 1. 更新主表
    await pool.query(
      `UPDATE courses 
       SET course_name=$1, credits=$2, semester=$3, type=$4, year_level=$5, dept_id=$6
       WHERE course_id=$7`,
      [course_name, credits, semester, type, year_level, dept_id, id]
    );

    // 2. 更新分類 (先刪後加)
    await pool.query(`DELETE FROM course_category_map WHERE course_id = $1`, [id]);
    const categoriesRes = await pool.query(
      `SELECT category_id FROM categories WHERE category_name = ANY($1)`,
      [categories]
    );
    for (const cat of categoriesRes.rows) {
      await pool.query(
        `INSERT INTO course_category_map (course_id, category_id) VALUES ($1, $2)`,
        [id, cat.category_id]
      );
    }

    // 3. 更新先修課程 (先刪後加)
    await pool.query(`DELETE FROM course_prerequisite WHERE course_id = $1`, [id]);
    if (prerequisite_ids.length > 0) {
      for (const prereqId of prerequisite_ids) {
        // 避免自己設為自己的先修 (防呆)
        if (Number(prereqId) !== Number(id)) {
          await pool.query(
            `INSERT INTO course_prerequisite (course_id, prereq_id) VALUES ($1, $2)`,
            [id, prereqId]
          );
        }
      }
    }

    // 更新模組關聯 (先刪後加)
    await pool.query(`DELETE FROM module_courses WHERE course_id = $1`, [id]);
    if (module_ids.length > 0) {
      for (const modId of module_ids) {
        await pool.query(
          `INSERT INTO module_courses (module_id, course_id) VALUES ($1, $2)`,
          [modId, id]
        );
      }
    }

    res.json({ message: "課程更新成功" });

  } catch (err) {
    console.error("更新錯誤:", err);
    res.status(500).json({ message: "伺服器錯誤", error: err.message });
  }
};

/* ============================================
   刪除課程（含完整外鍵檢查）同時清理 module_courses
============================================ */
export const deleteCourse = async (req, res) => {
  try {
    const id = req.params.id;

    // 檢查是否有先修依賴
    const prereq = await pool.query(
      `
      SELECT 1 FROM course_prerequisite
      WHERE prereq_id=$1 OR course_id=$1
      `,
      [id]
    );

    if (prereq.rowCount > 0) {
      return res.status(400).json({ message: "無法刪除：仍被先修關聯引用" });
    }

    // 清分類
    await pool.query(`DELETE FROM course_category_map WHERE course_id=$1`, [id]);

    // 清模組關聯 (雖然通常用 DB CASCADE 但這裡明確寫出較保險)
    await pool.query(`DELETE FROM module_courses WHERE course_id=$1`, [id]);

    // 刪課程
    await pool.query(`DELETE FROM courses WHERE course_id=$1`, [id]);

    res.json({ message: "刪除成功" });

  } catch (err) {
    console.error("刪除錯誤:", err);
    res.status(500).json({ message: "伺服器錯誤", error: err.message });
  }
};

export const getCategories = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categories ORDER BY category_id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("取得分類失敗:", err);
    res.status(500).json({ message: "伺服器錯誤", error: err.message });
  }
};