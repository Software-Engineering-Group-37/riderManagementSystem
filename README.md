# Rider Management System

A web-based system for scheduling and managing delivery rider shifts. Built to ensure smooth rider distribution across Accra with time-slot and location-based logic.

## 🚀 Features

* 📍 Assign riders to specific locations (Accra only)
* ⏰ Time slots: `7–11`, `11–3`, `3–6`
* 🔄 Reassign riders in real-time
* 🧑‍🤝‍🧑 Manager and Rider login
* 📊 View full rider history and current status
* 📱 Responsive layout (mobile + desktop)
* 🔐 Secure session-based authentication (in development)

## 💠 Tech Stack

| Layer       | Technology                             |
| ----------- | -------------------------------------- |
| Frontend    | React + TailwindCSS + MUI              |
| Backend     | JSON Server (dev), Spring boot (prod)  |
| Auth        | Session-based auth                     |
| DB (Dev)    | JSON                                   |
| DB (Prod)   | PostgreSQL (planned)                   |
| Map Service | Google Maps API (planned)              |

## 📂 Folder Structure

```
riderManagementSystem/
├── client/
│   ├── components/
│   ├── context/
│   ├── pages/
│   ├── styles/
│   └── ...
├── server/
│   ├── db.json
│   └── (future Go backend)
├── README.md
└── ...
```

## 🔧 Getting Started

1. **Clone the Repository**

   ```bash
   git clone https://github.com/your-username/riderManagementSystem.git
   cd riderManagementSystem
   ```

2. **Install Frontend Dependencies**

   ```bash
   cd client
   npm install
   ```

3. **Start JSON Server**

   ```bash
   npx json-server --watch db.json --port 3000
   ```

4. **Run the Frontend**

   ```bash
   npm run dev
   ```

## ✍️ Future Features

* ✅ Admin dashboard with charts
* ✅ Rider mobile location tracking
* ✅ Email/SMS notifications for shift updates
* ✅ Export reports as PDF/Excel
* ✅ Real backend in SpringBoot + PostgreSQL

## 👥 Team

* **Project Lead:** Susan Akua Krah
* **Frontend & UI/UX:** Edmund Mulcahy Amonoo
* **Backend:** Kwadwo Owusu Sarfo & Vincent Acquah
* **QA Tester:** Kelvin Yemoh Odoi
* **Database:** Selina Yeboah
* **DevOps:** Irene Abeikah Tetteh

## 📄 License

This project is licensed under the MIT License. You are free to use, modify, and share it.

> Built with ❤️ by ZoneX – 2025 Semester Project
