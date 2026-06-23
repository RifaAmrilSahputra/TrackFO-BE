# 🚀 TrackFO Backend

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=24&pause=1000&color=36BCF7&center=true&vCenter=true&width=600&lines=TrackFO+Backend+API;Technician+Tracking+System;FTTH+Network+Disturbance+Management;Node.js+%7C+Express+%7C+Prisma+%7C+MySQL" alt="Typing SVG" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white" />
  <img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" />
</p>

---

## 📖 Overview

TrackFO Backend adalah REST API yang dibangun untuk mendukung sistem monitoring teknisi lapangan dalam penanganan gangguan jaringan Fiber Optic (FTTH).

Backend ini bertugas sebagai pusat logika bisnis, autentikasi, manajemen data, assignment teknisi, tracking lokasi, dan pelaporan pekerjaan yang terintegrasi dengan aplikasi mobile dan web TrackFO.

---

## 🎯 Main Features

### 🔐 Authentication & Authorization

* JWT Authentication
* Role Based Access Control (RBAC)
* Login Management
* Password Encryption (bcrypt)
* Rate Limiting Protection

### 👥 User Management

* Super Admin Management
* Admin Management
* Technician Management
* Role Assignment

### 🚨 Disturbance Management

* Create Disturbance Reports
* Update Disturbance Status
* Disturbance Monitoring
* Work Progress Tracking

### 📍 Technician Tracking

* Real-Time Location Tracking
* Last Seen Monitoring
* Technician Activity Tracking
* GPS Coordinate Storage

### 📋 Assignment System

* Manual Technician Assignment
* Assignment History
* Assignment Status Monitoring

### 📄 Reporting

* Work Completion Reports
* Technician Performance Reports
* Disturbance Resolution Reports

---

## 🏗️ System Architecture

```text
                    ┌─────────────────────┐
                    │   TrackFO Web App   │
                    │ Admin / Super Admin │
                    └──────────┬──────────┘
                               │
                               │ REST API
                               │
                    ┌──────────▼──────────┐
                    │   TrackFO Backend   │
                    │      Express.js     │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
      Authentication     Business Logic      Tracking
            JWT            Assignment          GPS

                               │
                               ▼
                        Prisma ORM
                               │
                               ▼
                            MySQL
                               ▲
                               │
                    ┌──────────┴──────────┐
                    │ TrackFO Mobile App  │
                    │      Technician     │
                    └─────────────────────┘
```

---

## 🛠️ Tech Stack

| Category       | Technology         |
| -------------- | ------------------ |
| Runtime        | Node.js            |
| Framework      | Express.js         |
| Database       | MySQL              |
| ORM            | Prisma ORM         |
| Authentication | JWT                |
| Security       | bcrypt             |
| Environment    | dotenv             |
| Rate Limiter   | express-rate-limit |
| Testing        | Jest, Supertest    |

---

## 📂 Project Structure

```bash
trackfo-be/
│
├── prisma/
│   ├── schema.prisma
│   └── seed/
│
├── src/
│   ├── controllers/
│   ├── middlewares/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── server.js
│
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env
├── package.json
└── README.md
```

---

## ⚙️ Installation

### Clone Repository

```bash
git clone https://github.com/RifaAmrilSahputra/TrackFO-BE.git

cd TrackFO-BE
```

### Install Dependencies

```bash
npm install
```

### Setup Environment

```env
PORT=3000

DATABASE_URL="mysql://user:password@localhost:3306/trackfodb"

JWT_SECRET=your_secret_key
```

### Run Migration

```bash
npx prisma migrate dev
```

### Seed Database

```bash
npx prisma db seed
```

### Start Development Server

```bash
npm run dev
```

---

## 🧪 Testing

Run all tests:

```bash
npm test
```

Unit Testing:

```bash
npm run test:unit
```

Integration Testing:

```bash
npm run test:integration
```

End-to-End Testing:

```bash
npm run test:e2e
```

Coverage Report:

```bash
npm run test:coverage
```

---

## 🔗 TrackFO Ecosystem

TrackFO terdiri dari beberapa repository yang saling terintegrasi:

### 📱 TrackFO Mobile

Aplikasi Android untuk Teknisi Lapangan.

Repository:
https://github.com/RifaAmrilSahputra/TrackFO-Mobile

Features:

* Login Teknisi
* Task Management
* GPS Tracking
* Work History
* Profile Management

---

### 💻 TrackFO Web

Dashboard berbasis web untuk Super Admin dan Admin.

Repository:
https://github.com/RifaAmrilSahputra/TrackFO-Web

Features:

* Dashboard Monitoring
* Technician Management
* Disturbance Management
* Assignment System
* Live Tracking
* Reporting

---

### ⚙️ TrackFO Backend

REST API dan Business Logic Layer.

Repository:
https://github.com/RifaAmrilSahputra/TrackFO-BE

Features:

* Authentication
* Data Processing
* Assignment Logic
* Tracking Services
* Database Management

---

## 🚀 Roadmap

* [x] Authentication & Authorization
* [x] User Management
* [x] Role Management
* [x] Technician Management
* [x] Disturbance Management
* [x] Assignment System
* [x] GPS Tracking
* [x] Reporting Module
* [ ] Automatic Nearest Technician Assignment
* [ ] Push Notification System
* [ ] Real-Time Socket Communication
* [ ] Analytics Dashboard

---

## 👨‍💻 Developer

### Amril Nadapdap


GitHub:
https://github.com/RifaAmrilSahputra

LinkedIn:
https://linkedin.com/in/rifaamrilsahputra

---

⭐ If you find this project useful, consider giving it a star.
