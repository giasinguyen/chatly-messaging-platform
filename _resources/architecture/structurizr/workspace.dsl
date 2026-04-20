/*
 * Chatly Messaging Platform — C4 Container Diagram
 * Structurizr DSL
 *
 * Generated from actual codebase analysis (2026-04-20).
 * Reflects real infrastructure, not an idealised design.
 *
 * Render: https://structurizr.com/dsl  or  structurizr-cli
 */

workspace "Chatly Messaging Platform" "C4 Container-level architecture of the Chatly real-time messaging system." {

    !identifiers hierarchical

    model {

        /* ───────────────────── People ───────────────────── */

        webUser = person "Web User" "Uses Chatly via a web browser." "User"
        mobileUser = person "Mobile User" "Uses Chatly via the Expo mobile app." "User"

        /* ───────────────────── Software System ───────────────────── */

        chatly = softwareSystem "Chatly Messaging Platform" "Real-time messaging platform with AI assistant, file sharing, and video/audio calls." {

            /* ─── Frontend Containers ─── */

            webApp = container "Web Application" "Single-page application providing the Chatly web experience: chat, calls, file sharing, AI assistant." "React 19 / TypeScript 5 / Vite 7 / Zustand / Tailwind CSS v4" "WebBrowser"
            mobileApp = container "Mobile Application" "Native mobile client for Chatly: chat, calls, push notifications, AI assistant." "Expo 54 / React Native 0.81 / NativeWind / Zustand" "MobileApp"

            /* ─── Backend Containers ─── */

            backend = container "Backend API Server" "Handles authentication, user management, contacts, groups, conversations, messages, file uploads, presence, and WebSocket brokering. Main entry point for all client traffic." "Java 21 / Spring Boot 4 / Spring Security / Spring WebSocket (STOMP)" "SpringBoot"

            agentService = container "AI Agent Service" "LLM-powered chatbot pipeline. Manages AI sessions, prompt engineering, RAG retrieval, tool execution, and MCP server orchestration." "Python 3.12 / FastAPI / LangGraph / LangChain" "PythonService"

            /* ─── Data Stores ─── */

            postgresDb = container "PostgreSQL Database" "Stores users, contacts, friend requests, groups, and group memberships." "PostgreSQL 16" "Database"
            mongoDbBackend = container "MongoDB (Backend)" "Stores conversations and messages (chat history)." "MongoDB 7" "Database"
            redisCache = container "Redis" "Caches presence state, JWT token blacklist, and session data." "Redis 7" "Cache"
            mongoDbAgent = container "MongoDB (Agent)" "Stores AI agent sessions, chat history, and tool execution logs." "MongoDB 7" "Database"
            qdrantDb = container "Qdrant Vector Database" "Stores document embeddings for Retrieval-Augmented Generation (RAG)." "Qdrant" "VectorDB"

            /* ─── External/Pluggable Storage ─── */

            fileStorage = container "File / Object Storage" "Stores uploaded files and media. Supports local filesystem (dev) or AWS S3 (prod) for the backend; MinIO/S3 for the agent." "Local FS / AWS S3 / MinIO" "FileStorage"

            /* ─── MCP Servers (Agent Tools) ─── */

            mcpServers = container "MCP Tool Servers" "External Model Context Protocol servers providing additional tools to the AI agent (e.g., math, text processing). Dynamically registered." "Python / FastAPI / MCP SDK" "MCPServer"
        }

        /* ───────────────────── External Systems ───────────────────── */

        groqLlm = softwareSystem "Groq LLM API" "Provides large language model inference (Llama 3.3 70B) for the AI agent." "External"
        huggingFace = softwareSystem "HuggingFace API" "Provides embedding models (BGE-base-en-v1.5) for vector search." "External"
        tavily = softwareSystem "Tavily Search API" "Provides web search capabilities as an agent tool." "External"
        apns = softwareSystem "Apple / Google Push Services" "Delivers push notifications to mobile devices (APNs / FCM via Expo)." "External"

        /* ───────────────────── Relationships ───────────────────── */

        /* --- Users → Frontend --- */
        webUser -> chatly.webApp "Uses" "HTTPS"
        mobileUser -> chatly.mobileApp "Uses" "HTTPS"

        /* --- Frontend → Backend (REST) --- */
        chatly.webApp -> chatly.backend "Calls REST APIs (auth, users, contacts, groups, messages, file upload)" "HTTPS / JSON"
        chatly.mobileApp -> chatly.backend "Calls REST APIs (auth, users, contacts, groups, messages, file upload)" "HTTPS / JSON"

        /* --- Frontend → Backend (WebSocket) --- */
        chatly.webApp -> chatly.backend "Real-time chat, typing indicators, presence, call signaling" "WebSocket (STOMP over SockJS)"
        chatly.mobileApp -> chatly.backend "Real-time chat, typing indicators, presence, call signaling" "WebSocket (STOMP)"

        /* --- Frontend WebRTC (peer-to-peer, signaled via backend) --- */
        /* NOTE: WebRTC media flows peer-to-peer between clients.
           Signaling (offer/answer/ICE) goes through the backend WebSocket. */
        chatly.webApp -> chatly.mobileApp "WebRTC media streams (audio/video calls)" "WebRTC (peer-to-peer)" {
            tags "WebRTC"
        }

        /* --- Backend → Data Stores --- */
        chatly.backend -> chatly.postgresDb "Reads/writes user, contact, group data" "JDBC / Spring Data JPA"
        chatly.backend -> chatly.mongoDbBackend "Reads/writes conversations and messages" "Spring Data MongoDB"
        chatly.backend -> chatly.redisCache "Caches presence, token blacklist, session data" "Spring Data Redis / Lettuce"

        /* --- Backend → File Storage --- */
        chatly.backend -> chatly.fileStorage "Uploads and serves files/media" "Local FS API / AWS S3 SDK"

        /* --- Backend → Agent Service --- */
        chatly.backend -> chatly.agentService "Forwards AI chat requests, passes user context" "Internal REST (X-Internal-API-Key + X-User-Id headers)"

        /* --- Backend → Push Services --- */
        chatly.backend -> apns "Sends push notifications (via Expo push endpoint)" "HTTPS"

        /* --- Agent Service → Data Stores --- */
        chatly.agentService -> chatly.mongoDbAgent "Stores/retrieves agent sessions, chat history" "Motor (async MongoDB driver)"
        chatly.agentService -> chatly.qdrantDb "Stores/queries document embeddings for RAG" "Qdrant Python client"
        chatly.agentService -> chatly.fileStorage "Stores/retrieves uploaded documents for processing" "MinIO Python client / boto3"

        /* --- Agent Service → External AI APIs --- */
        chatly.agentService -> groqLlm "Sends LLM inference requests" "HTTPS / REST"
        chatly.agentService -> huggingFace "Fetches embedding vectors" "HTTPS / REST"
        chatly.agentService -> tavily "Performs web searches as agent tool" "HTTPS / REST"

        /* --- Agent Service → MCP Servers --- */
        chatly.agentService -> chatly.mcpServers "Dynamically registers and invokes tools" "HTTP / MCP Protocol"

        /* --- Mobile → Push Services --- */
        chatly.mobileApp -> apns "Receives push notifications" "APNs / FCM"
    }

    views {

        container chatly "ContainerDiagram" "C4 Container diagram showing all major runtime containers and their interactions." {
            include *
            include groqLlm
            include huggingFace
            include tavily
            include apns

            autoLayout lr 400 200
        }

        styles {
            element "Person" {
                shape Person
                background #08427B
                color #ffffff
            }
            element "Software System" {
                background #1168BD
                color #ffffff
            }
            element "Container" {
                background #438DD5
                color #ffffff
            }
            element "WebBrowser" {
                shape WebBrowser
                background #438DD5
                color #ffffff
            }
            element "MobileApp" {
                shape MobileDevicePortrait
                background #438DD5
                color #ffffff
            }
            element "SpringBoot" {
                background #6DB33F
                color #ffffff
                icon "spring"
            }
            element "PythonService" {
                background #3776AB
                color #ffffff
            }
            element "Database" {
                shape Cylinder
                background #F5A623
                color #ffffff
            }
            element "Cache" {
                shape Cylinder
                background #DC382D
                color #ffffff
            }
            element "VectorDB" {
                shape Cylinder
                background #7B61FF
                color #ffffff
            }
            element "FileStorage" {
                shape Folder
                background #8BC34A
                color #ffffff
            }
            element "MCPServer" {
                background #FF6F00
                color #ffffff
            }
            element "External" {
                background #999999
                color #ffffff
            }
            relationship "Relationship" {
                thickness 2
                color #707070
            }
            relationship "WebRTC" {
                style dashed
                color #E91E63
            }
        }

        theme default
    }

}
