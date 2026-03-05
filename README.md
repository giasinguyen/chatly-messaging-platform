<div align="center">
  <img src="_resources/images/chatly-logo.png" alt="Chatly Logo" width="200"/>
  
  # Chatly Messaging Platform
  
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
  [![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791.svg)](https://www.postgresql.org/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-6+-47A248.svg)](https://www.mongodb.com/)
  
  **A modern real-time messaging platform inspired by Zalo and Messenger**
  
  [Features](#-features) • [Architecture](#️-system-architecture) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Deployment](#️-deployment)
</div>

---

Chatly is a real-time messaging platform inspired by modern chat applications such as Zalo and Messenger.  
This project is built for educational purposes, focusing on scalable architecture, real-time communication, and cloud deployment.

---

## 👥Members

- Nguyễn Trần Gia Sĩ
- Nguyễn Văn Minh ☁
- Nguyễn Trung Nguyên 🗿
- Đào Quốc Tuấn

---

## 📌 Features

- Real-time 1–1 and group messaging
- Online / offline presence
- Message delivery & read receipts
- Typing indicators
- Media sharing (images, files)
- User authentication & authorization
- Scalable backend architecture
- Cloud-native deployment on AWS

---

## 🏗️ System Architecture

Chatly is designed with a service-oriented architecture:

- **Frontend**: Web & Mobile clients
- **Backend API**: REST + WebSocket
- **Realtime Layer**: WebSocket for instant messaging
- **Databases**:
    - PostgreSQL for relational data (users, relationships, permissions)
    - MongoDB for chat messages and conversation data
- **Cache & Realtime State**: Redis
- **Media Storage**: Amazon S3
- **Deployment**: AWS Cloud Infrastructure

---

## 🧱 Tech Stack

### Backend

- Node.js / Java Spring Boot _(configurable)_
- RESTful API
- WebSocket (Socket.IO / native WS)
- JWT Authentication

### Frontend

- React / Next.js _(Web)_
- Flutter / React Native _(Mobile – optional)_

### Database

- **PostgreSQL** – transactional & relational data
- **MongoDB** – message storage & chat history
- **Redis** – caching, session, presence

### Cloud & DevOps

- AWS EC2 / ECS / EKS
- AWS RDS (PostgreSQL)
- MongoDB Atlas
- Amazon S3 + CloudFront
- Docker & Docker Compose
- GitHub Actions (CI/CD)

---

## 🗂️ Project Structure (Monorepo)

```text
chatly-messaging-platform/
├── backend/
│   ├── auth-service/
│   ├── user-service/
│   ├── chat-service/
│   ├── notification-service/
│   └── media-service/
├── frontend/
│   ├── web-client/
│   └── mobile-client/
├── infrastructure/
│   ├── docker/
│   └── terraform/
├── docs/
└── README.md
```

---

## 🔐 Authentication & Security

- JWT + Refresh Token
- Password hashing (bcrypt / argon2)
- Role-based access control (RBAC)
- Rate limiting & request validation
- HTTPS & secure communication

---

## ☁️ Deployment

The system is deployed on **AWS** with the following services:

- EC2 / ECS for backend services
- RDS for PostgreSQL
- MongoDB Atlas for NoSQL storage
- S3 for media files
- CloudFront as CDN
- Redis for caching and realtime state

---

## 🚀 Getting Started (Local Development)

### Prerequisites

- Docker & Docker Compose
- Node.js / JDK
- PostgreSQL
- MongoDB
- Redis

### Run locally

```bash
docker-compose up -d
```

---

## 📖 Educational Purpose

This project is developed **for learning and academic purposes only**.
Chatly is **not affiliated with or endorsed by Zalo or any other commercial messaging platform**.

---

## 📌 Future Improvements

- End-to-End Encryption (E2EE)
- Message search with Elasticsearch
- Push notifications (FCM / APNs)
- Voice & video calling
- Kubernetes-based deployment
- Advanced monitoring & tracing

---
