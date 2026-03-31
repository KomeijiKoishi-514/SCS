// server/utils/email.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const sendEmail = async (options) => {
  // 1. 建立 Transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    //secure: process.env.SMTP_PORT == 465, 
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // 2. 定義信件內容
  const mailOptions = {
    from: `學程地圖系統 <${process.env.SMTP_FROM_EMAIL}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    // text: options.message // 如果不想用 HTML 格式可用純文字
  };

  try {
      console.log("🚀 準備發送郵件至:", options.to);
      const info = await transporter.sendMail(mailOptions);
      console.log("郵件發送成功！伺服器回應:", info.response);
  } catch (error) {
      console.error("nodemailer 寄信失敗！詳細錯誤碼:", error);
      throw error; // 確保錯誤能被外層的 authController 抓到
  }
};

export default sendEmail;