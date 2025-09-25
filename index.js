// backend/index.js
import 'dotenv/config';
import crypto from 'crypto';
import https from 'https';

import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import axios from 'axios';

export const app = express(); // ← 테스트/스모크에서 import만으로 로딩 테스트 가능
const port = process.env.PORT || 8081;

app.use(cors({ origin: true })); // 운영에서는 특정 도메인만 허용 권장
app.use(express.json());

/* ───────── SMTP(메일) ───────── */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: String(process.env.SMTP_SECURE) === 'true', // 465:true / 587:false
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// CI나 테스트에서는 실제 네트워크 검증을 생략
const isCI = process.env.CI === 'true' || process.env.NODE_ENV === 'test';
if (!isCI) {
  transporter
    .verify()
    .then(() => console.log('SMTP OK'))
    .catch((e) => console.error('SMTP ERROR:', e.message));
}

/* ───────── SOLAPI REST 인증 헬퍼 ───────── */
function createSolapiAuthHeader(apiKey, apiSecret) {
  const dateTime = new Date().toISOString(); // ISO8601 (UTC)
  const salt = crypto.randomBytes(16).toString('hex'); // 12~64 bytes random
  const signature = crypto.createHmac('sha256', apiSecret).update(dateTime + salt).digest('hex');
  return `HMAC-SHA256 apiKey=${apiKey}, date=${dateTime}, salt=${salt}, signature=${signature}`;
}

const required = (v) => typeof v === 'string' && v.trim() !== '';

// 요청 로깅(디버그)
app.use((req, _res, next) => {
  if (req.method !== 'GET') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`, req.body || {});
  }
  next();
});

app.post('/api/send', async (req, res) => {
  try {
    const { carNumber, phone, region, mileage } = req.body || {};
    if (![carNumber, phone, region, mileage].every(required)) {
      return res.status(400).json({ ok: false, error: 'invalid_payload' });
    }

    // ----- 1) 메일 전송 -----
    const subject = `중고차 빠른 판매 등록 - ${carNumber}`;
    const mailText = [
      `차량번호: ${carNumber}`,
      `연락처: ${phone}`,
      `지역: ${region}`,
      `운행거리: ${mileage} km`,
    ].join('\n');

    await transporter.sendMail({
      from: `"중고차 빠른 판매" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject,
      text: mailText,
    });

    // ----- 2) 문자 전송 (관리자+딜러, SMS 45자 제한) -----
    const from = (process.env.SMS_SENDER || '').replace(/[^\d]/g, '');
    const toDealer = (process.env.DEALER_PHONE || '').replace(/[^\d]/g, '');
    const toManager = (process.env.MANAGER_PHONE || '').replace(/[^\d]/g, '');

    if (!from) throw new Error('missing SMS_SENDER (발신번호 미설정)');
    const recipients = [toManager, toDealer].filter(Boolean);
    if (recipients.length === 0) {
      return res.status(400).json({ ok: false, error: 'no_sms_recipients' });
    }

    let smsText = `${carNumber} ${phone} ${region} ${mileage}km`;
    if (smsText.length > 45) smsText = `${carNumber}/${phone}/${region}/${mileage}km`;
    if (smsText.length > 45) {
      return res.status(400).json({
        ok: false,
        error: 'sms_too_long',
        detail: `문자 길이 ${smsText.length}자(최대 45자). 입력값을 줄여주세요.`,
      });
    }

    // REST API로 직접 호출 (IPv4 강제)
    const authHeader = createSolapiAuthHeader(
      process.env.SOLAPI_API_KEY,
      process.env.SOLAPI_API_SECRET
    );
    const url = 'https://api.solapi.com/messages/v4/send-many/detail';

    const payload = {
      messages: recipients.map((to) => ({ to, from, text: smsText, type: 'SMS' })),
    };

    const ipv4Agent = new https.Agent({ family: 4, keepAlive: true });

    try {
      const { status, data } = await axios.post(url, payload, {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        httpsAgent: ipv4Agent,
        timeout: 10000,
      });
      console.log('[sms:result]', status, JSON.stringify(data));
      return res.json({ ok: true, sms: data });
    } catch (smsErr) {
      const status = smsErr?.response?.status;
      const data = smsErr?.response?.data;
      console.error('[sms:http:error]', status, data || smsErr.message);
      return res.status(502).json({
        ok: false,
        error: 'sms_failed',
        detail: data ? (typeof data === 'string' ? data : JSON.stringify(data)) : smsErr.message,
      });
    }
  } catch (err) {
    const detail = err?.response?.data || err?.data || err?.message || err;
    console.error('[send:error]', detail);
    res.status(500).json({
      ok: false,
      error: 'send_failed',
      detail: typeof detail === 'string' ? detail : JSON.stringify(detail),
    });
  }
});

/* ───────── “직접 실행일 때만” 서버 시작 (import 시에는 미기동) ───────── */
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  console.log('ENV CHECK', {
    SMS_SENDER: process.env.SMS_SENDER?.replace(/\d(?=\d{3})/g, '*'),
    DEALER_PHONE: process.env.DEALER_PHONE?.replace(/\d(?=\d{3})/g, '*'),
    MANAGER_PHONE: process.env.MANAGER_PHONE?.replace(/\d(?=\d{3})/g, '*'),
    SOLAPI_API_KEY: process.env.SOLAPI_API_KEY ? '***set***' : 'missing',
    SOLAPI_API_SECRET: process.env.SOLAPI_API_SECRET ? '***set***' : 'missing',
  });

  app.listen(port, () => console.log(`API listening on ${port}`));
}
