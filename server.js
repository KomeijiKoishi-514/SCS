// server.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";
import path from "path";
import { fileURLToPath } from "url";

// 匯入路由
import adminUserRoutes from "./routes/adminUserRoutes.js"
import categoryRoutes from "./routes/categoryRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import curriculumRoutes from "./routes/curriculumRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import planRoutes from "./routes/planRoutes.js";
import recordRoutes from "./routes/recordRoutes.js";

dotenv.config();

// 建立 __dirname 的 ES Module 替代方案
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json());

const corsOptions = {
  origin: [
    "http://localhost:3000", // 允許本地開發
    "https://my-super-project-api.loca.lt"
  ],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// ======================================
// Neon 資料庫初始化
// ======================================
const sql = neon(process.env.DATABASE_URL);
// 測試連線 API
app.get("/api/version", async (req, res) => {
  try {
    const result = await sql`SELECT version()`;
    res.json({ version: result[0].version });
  } catch (err) {
    console.error("資料庫連線錯誤:", err);
    res.status(500).json({ error: "無法連線資料庫" });
  }
});

// ======================================
//  API 路由掛載區
// ======================================
app.use("/api/auth", authRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/course-categories", categoryRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/curriculum", curriculumRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/user", userRoutes);
app.use("/api/records", recordRoutes);


// ======================================
// 前端靜態檔案派發與 SPA 路由防呆
// ======================================
// 確定client和server.js在同一層
// 如果前端是用 Vite 打包，通常會產生 'dist' 資料夾；如果是 CRA 則是 'build'
// 若路徑不同，請修改 "client/dist" 這段字串。

app.use(express.static(path.join(__dirname, "client/public")));

// 捕捉所有非 API 開頭的請求，並將它們導向 React 的 index.html
// 這樣當使用者直接重整網頁或手動輸入網址時，才不會出現 Cannot GET /xxx 的錯誤
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client/public/index.html"));
});


// ======================================
//  啟動伺服器
// ======================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on 0.0.0.0:${PORT}`);
});
