# CampusRelay

CampusRelay는 학교 기반 무료 나눔 / 중고 거래 플랫폼입니다.
MVP → 일본 전국 확장을 목표로 합니다.

---

## 🔧 Tech Stack

* Frontend: React + TypeScript + Vite
* Backend: Supabase (DB / Auth / Storage)
* Hosting: Cloudflare Pages
* Map: Google Maps API

---

## 📌 Core Features

* 학교 기반 사용자 인증
* 게시글 등록 (무료 나눔 / 판매)
* 채팅 기반 거래
* 지도 기반 탐색
* 학교별 데이터 분리

---

## 📁 Project Structure

```
src/
  ├── components/
  ├── pages/
  ├── hooks/
  ├── lib/
  ├── types/
  ├── App.tsx
  └── main.tsx

supabase/
  ├── migrations/
  └── functions/
```

---

## ⚙️ Development Rules

* Always generate complete code in one request
* Do not split files across multiple prompts
* No auto execution / testing / debugging
* Keep output minimal (code first)

👉 See AGENT.md for full generation rules

---

## 🔐 Security

* Supabase RLS required
* Users can only access data within the same school
* Only owners can modify their data

---

## 🚀 Getting Started

```bash
npm install
npm run dev
```

---

## 🌍 Deployment

* Deploy via Cloudflare Pages
* Connect custom domain (campusrelay.jp)

---

## 📈 Future Plan

* School → Region → Nationwide expansion
* Admin system per school
* Monetization (ads / premium)

---

## ⚠️ Notes

* MVP first (avoid over-engineering)
* Mobile-first UI
* Simple UX is priority

---
