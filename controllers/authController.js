// controllers/authController.js
import pool from "../config/db.js";
import bcrypt from "bcrypt";
import crypto from 'crypto'; // 引入 Node.js 內建加密模組
import sendEmail from '../utils/email.js'; // 引入剛寫好的郵件工具
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";

// ==================================================================
// 管理員註冊 (開發用) 
// ==================================================================
export async function adminRegister(req, res) {
  // 1. 從 body 中多解構出 email
  const { username, password, display_name, email } = req.body;

  // 2. 增加 email 的必填檢查
  if (!username || !password || !email)
    return res.status(400).json({ message: "帳號、密碼與 Email 皆為必填" });

  // (選填) 這裡可以加入 regex 檢查 email 格式是否正確

  try {
    const hash = await bcrypt.hash(password, 10);
    
    // 3. 修改 SQL 插入語句，加入 email 欄位
    const result = await pool.query(
      `INSERT INTO users (username, password_hash, full_name, role, email) 
       VALUES ($1, $2, $3, 'admin', $4) 
       RETURNING user_id, username, full_name, role, email`,
      [username, hash, display_name || username, email] // 加入 email 參數
    );
    
    res.json({ message: "管理員註冊成功", user: result.rows[0] });

  } catch (err) {
    // 處理帳號或 Email 重複的錯誤 (PostgreSQL 錯誤碼 23505)
    if (err.code === '23505') {
        // 判斷是帳號重複還是 Email 重複
        if (err.detail.includes('email')) {
            return res.status(409).json({ message: "此 Email 已被使用" });
        }
        return res.status(409).json({ message: "此帳號已被註冊" });
    }
    console.error("註冊失敗:", err);
    res.status(500).json({ message: "伺服器錯誤" });
  }
}


// ==================================================================
// 通用登入 (管理員與學生共用)
// ==================================================================
// 建議將函式名稱從 adminLogin 改為 login，比較符合語意
export async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: "帳號與密碼為必填" });

  try {
    // 1. 查詢使用者 (包含 role 欄位)
    const result = await pool.query(
      "SELECT user_id, username, password_hash, role, full_name, email, dept_id FROM users WHERE username=$1",
      [username]
    );

    if (result.rowCount === 0)
      return res.status(401).json({ message: "帳號或密碼錯誤" });

    const user = result.rows[0];

    // 2. 驗證密碼
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: "帳號或密碼錯誤" });

    // 3. 產生 Token (這一步所有人都一樣)
    // 重要：Payload 裡面一定要有 role，前端和 Middleware 才能判斷
    const tokenPayload = {
      id: user.user_id,
      username: user.username,
      role: user.role // 👈 學生或管理員的角色都會被包進去
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "24h" });

    console.log(`[登入成功] 使用者: ${user.username}, 角色: ${user.role}`);

    // 4. 回傳 Token 與使用者資訊 (不含密碼)
    res.json({
        token,
        user: {
            id: user.user_id,
            username: user.username,
            name: user.full_name,
            role: user.role, // 前端需要這個來決定跳轉去哪
            email: user.email,
            dept_id: user.dept_id
        }
    });

  } catch (err) {
    console.error("登入失敗:", err);
    res.status(500).json({ message: "伺服器錯誤，請稍後再試" });
  }
}

// ==================================================================
// 學生/一般使用者註冊
// ==================================================================
export async function register(req, res) {
  // 1. 從請求 body 中解構出使用者資料
  // username 這裡通常對應學生的學號
  const { username, password, full_name, email, dept_id } = req.body;

  // 2. 基本資料驗證 (必填欄位檢查)
  // dept_id 可以視需求決定是否為必填
  if (!username || !password || !full_name || !email) {
    return res.status(400).json({ message: "學號、密碼、姓名與 Email 皆為必填欄位" });
  }

  // (選擇性) 這裡可以加入更詳細的驗證，例如 Email 格式、密碼強度檢查

  try {
    // 3. 檢查帳號 (學號) 或 Email 是否已被註冊
    // 雖然資料庫有 unique constraint，但先查詢可以回傳更明確的錯誤訊息
    const userExist = await pool.query(
      "SELECT username, email FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );

    if (userExist.rowCount > 0) {
      const existUser = userExist.rows[0];
      if (existUser.username === username) {
        return res.status(409).json({ message: "此學號已被註冊" });
      }
      if (existUser.email === email) {
        return res.status(409).json({ message: "此 Email 已被使用" });
      }
    }

    // 4. 密碼加密
    const saltRounds = 10; // 加鹽的迭代次數，10 是個不錯的平衡點
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 5. 寫入資料庫
    // 🔥 重點：強制將 role 設定為 'student'
    const insertQuery = `
      INSERT INTO users (username, password_hash, full_name, email, role, dept_id)
      VALUES ($1, $2, $3, $4, 'student', $5)
      RETURNING user_id, username, full_name, role, email, dept_id;
    `;
    
    const newUserResult = await pool.query(insertQuery, [
      username,
      hashedPassword,
      full_name,
      email,
      dept_id || null // 如果沒填系所就存 NULL
    ]);
    
    const newUser = newUserResult.rows[0];

    // =================================================================
    // 🔥 新增功能：自動將「必修課」加入該學生的課程規劃中
    // =================================================================
    
    // 1. 定義入學學年度 (這裡暫時寫死 113，實務上可由前端傳入或依當前年份計算)
    const startYear = 113; 

    // 2. 找出該系所(或通用)的所有「必修」課程
    // 邏輯：
    // - 課程必須屬於該學生的 dept_id 或 dept_id=0 (通用)
    // - 課程必須有被歸類在 category_id IN (1, 3, 4) (系定、校定、院定必修)
    const compulsoryCoursesQuery = `
      SELECT DISTINCT c.course_id, c.year_level
      FROM courses c
      JOIN course_category_map m ON c.course_id = m.course_id
      WHERE (c.dept_id = $1 OR c.dept_id = 0)
        AND m.category_id IN (1, 3, 4)
    `;
    
    // 注意：dept_id 可能是 null (如果沒填)，這裡要防呆
    const userDeptId = newUser.dept_id || 0; 

    const compulsoryCoursesResult = await pool.query(compulsoryCoursesQuery, [userDeptId]);
    const compulsoryCourses = compulsoryCoursesResult.rows;

    // 3. 批量寫入 student_course_plans
    if (compulsoryCourses.length > 0) {
      // 準備批量插入的數據
      // 我們需要計算每門課的 academic_year (學年) 和 semester (學期)
      // 公式：
      //   year_level = 1 (一上) -> year_offset = 0, sem = 1
      //   year_level = 2 (一下) -> year_offset = 0, sem = 2
      //   year_level = 3 (二上) -> year_offset = 1, sem = 1
      
      const planValues = compulsoryCourses.map(course => {
        const yearLevel = course.year_level;
        // 計算學年偏移量: (年級 - 1) / 2 的整數部分
        const yearOffset = Math.floor((yearLevel - 1) / 2);
        // 計算學期: 奇數為 1 (上)，偶數為 2 (下)
        const semester = (yearLevel % 2) !== 0 ? 1 : 2;
        
        const targetYear = startYear + yearOffset;

        // 回傳要插入的參數陣列: [user_id, course_id, academic_year, semester]
        return `(${newUser.user_id}, ${course.course_id}, ${targetYear}, ${semester})`;
      });

      // 4. 執行單次批量插入 SQL (比迴圈插入更高效)
      const insertPlansQuery = `
        INSERT INTO student_course_plans (user_id, course_id, academic_year, semester)
        VALUES ${planValues.join(', ')}
        ON CONFLICT DO NOTHING; -- 避免重複錯誤
      `;
      
      await pool.query(insertPlansQuery);
      console.log(`已自動為學生 ${newUser.username} 加入 ${compulsoryCourses.length} 門必修課規劃。`);
    }

    // =================================================================

    // 6. (選擇性) 註冊成功後自動登入，發放 Token
    // 如果你希望使用者註冊後還需要去收信驗證，這一步就先跳過
    const tokenPayload = {
      id: newUser.user_id,
      username: newUser.username,
      role: newUser.role
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "24h" });
    
    // 7. 回傳成功訊息與資料
    res.status(201).json({ 
      message: "註冊成功！", 
      token,
      user: newUser
    });

  } catch (err) {
    console.error("註冊失敗:", err);
    // 資料庫層級的錯誤捕捉 (例如併發請求導致的重複鍵值)
    if (err.code === '23505') {
        return res.status(409).json({ message: "註冊失敗，帳號或 Email 已存在" });
    }
    res.status(500).json({ message: "伺服器內部錯誤，請稍後再試" });
  }
}

// ==================================================================
// 忘記密碼 - 接收 Email 並發送重設連結信件
// ==================================================================
export async function forgotPassword(req, res) {
  const { email } = req.body;

  // 1. 基本檢查
  if (!email) {
      return res.status(400).json({ message: "請提供 Email 地址" });
  }

  try {
    // 2. 檢查使用者是否存在
    // 我們從 users 表中查詢，這樣無論是管理員還是未來可能的學生都能用
    const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = userResult.rows[0];

    if (!user) {
      // 即使 Email 不存在，也要說已經發送。
      // 這是為了防止惡意人士透過 API 來探測哪些 Email 已經註冊過。
      return res.status(200).json({ message: "重設連結已發送至您的 Email。請檢查您的信箱（包含垃圾郵件匣）。" });
    }

    // 3. 產生隨機 Token (原始 Token，將寄給使用者)
    // 產生一個 32 bytes 的隨機十六進位字串
    const resetToken = crypto.randomBytes(32).toString('hex');

    // 4. 對 Token 進行 Hash (雜湊) 處理 (將存入資料庫)
    // 我們不存原始 Token，而是存它的雜湊值，這樣更安全
    const resetPasswordTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // 5. 設定過期時間 (例如：現在時間往後推 1 小時)
    const resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // 6. 將 Hash 後的 Token 和過期時間存入資料庫
    await pool.query(
      "UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3",
      [resetPasswordTokenHash, resetPasswordExpires, email]
    );

    // 7. 建立重設連結
    // 這個連結指向前端頁面，並在網址中包含原始的 resetToken
    // CLIENT_URL 是你在 .env 設定的前端網址 (例如 http://localhost:3000)
    //  ${process.env.CLIENT_URL}
    const resetUrl = `http://${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    // 8. 準備信件內容 (HTML 格式)
    const message = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #333; text-align: center;">密碼重設請求</h2>
        <p style="font-size: 16px; color: #555;">親愛的使用者 您好：</p>
        <p style="font-size: 16px; color: #555;">我們收到了您帳戶的密碼重設請求。請點擊下方的按鈕以重設您的密碼：</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">重設我的密碼</a>
        </div>
        <p style="font-size: 14px; color: #777;">此連結將在 <strong>1 小時後失效</strong>。</p>
        <p style="font-size: 14px; color: #777;">如果您沒有請求重設密碼，請忽略此信件，您的帳戶依然安全。</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #999; text-align: center;">此為系統自動發送之信件，請勿直接回覆。</p>
      </div>
    `;

    try {
      // 9. 發送郵件
      await sendEmail({
        to: user.email,
        subject: '【學程地圖系統】密碼重設請求',
        html: message,
      });

      // 10. 發送成功，回傳訊息給前端
      res.status(200).json({ message: "重設連結已發送至您的 Email。請檢查您的信箱（包含垃圾郵件匣）。" });

    } catch (emailError) {
      //  如果寄信失敗，這是一個重要的錯誤處理步驟：
      // 我們必須把剛剛存進資料庫的 Token 清掉，避免這個使用者帳號卡在「等待重設」的狀態。
      await pool.query(
        "UPDATE users SET reset_password_token = NULL, reset_password_expires = NULL WHERE email = $1",
        [email]
      );
      console.error("郵件發送失敗:", emailError);
      return res.status(500).json({ message: "郵件發送失敗，請稍後再試。" });
    }

  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ message: "伺服器內部錯誤，請聯繫管理員。" });
  }
}


// ==================================================================
// 重設密碼
// ==================================================================
export async function resetPassword(req, res) {
  // 1. 從網址參數中取得原始 Token
  const resetToken = req.params.token;
  // 2. 從請求 body 中取得新密碼
  const { password } = req.body;

  // 基本檢查
  if (!resetToken || !password) {
      return res.status(400).json({ message: "無效的請求" });
  }

  if (password.length < 6) {
      return res.status(400).json({ message: "新密碼長度至少需 6 個字元" });
  }

  try {
    // 3. 將收到的原始 Token 進行雜湊，以便與資料庫比對
    const resetPasswordTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // 4. 查詢資料庫：尋找 Token 匹配且尚未過期的使用者
    // 注意：我們同時檢查 token hash 和 expires 時間
    const userResult = await pool.query(
      "SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > $2",
      [resetPasswordTokenHash, new Date()]
    );

    const user = userResult.rows[0];

    if (!user) {
      // 如果找不到使用者，代表 Token 無效或已過期
      return res.status(400).json({ message: "密碼重設連結無效或已過期，請重新申請。" });
    }

    // 5. 驗證通過，準備更新密碼
    // 將新密碼加密
    const saltRounds = 10;
    const newHashedPassword = await bcrypt.hash(password, saltRounds);

    // 6. 更新資料庫：設定新密碼，並清除重設 Token 欄位
    await pool.query(
      "UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE user_id = $2",
      [newHashedPassword, user.user_id]
    );

    // 7. 回傳成功訊息
    res.status(200).json({ message: "密碼重設成功！請使用新密碼登入。" });

  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: "伺服器內部錯誤" });
  }
}
