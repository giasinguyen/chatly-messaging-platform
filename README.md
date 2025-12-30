# Chatly Messaging Platform

Chatly is a real-time messaging platform inspired by modern chat applications such as Zalo and Messenger.  
This project is built for educational purposes, focusing on scalable architecture, real-time communication, and cloud deployment.

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
- Node.js / Java Spring Boot *(configurable)*
- RESTful API
- WebSocket (Socket.IO / native WS)
- JWT Authentication

### Frontend
- React / Next.js *(Web)*
- Flutter / React Native *(Mobile – optional)*

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
````

---

## 🔐 Authentication & Security

* JWT + Refresh Token
* Password hashing (bcrypt / argon2)
* Role-based access control (RBAC)
* Rate limiting & request validation
* HTTPS & secure communication

---

## ☁️ Deployment

The system is deployed on **AWS** with the following services:

* EC2 / ECS for backend services
* RDS for PostgreSQL
* MongoDB Atlas for NoSQL storage
* S3 for media files
* CloudFront as CDN
* Redis for caching and realtime state

---

## 🚀 Getting Started (Local Development)

### Prerequisites

* Docker & Docker Compose
* Node.js / JDK
* PostgreSQL
* MongoDB
* Redis

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

* End-to-End Encryption (E2EE)
* Message search with Elasticsearch
* Push notifications (FCM / APNs)
* Voice & video calling
* Kubernetes-based deployment
* Advanced monitoring & tracing

---