# Chatly — EC2 Deployment Guide

> This guide covers deploying the **Backend** (Spring Boot) and **AI Agent** (FastAPI)
> on a single Ubuntu EC2 instance using Docker Compose, and configuring automated
> CI/CD via GitHub Actions.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Install Docker on Ubuntu EC2](#2-install-docker-on-ubuntu-ec2)
3. [Clone the Repository](#3-clone-the-repository)
4. [Create the .env File](#4-create-the-env-file)
5. [Build and Run with Docker Compose](#5-build-and-run-with-docker-compose)
6. [Verify the Deployment](#6-verify-the-deployment)
7. [View Logs](#7-view-logs)
8. [Restart and Redeploy](#8-restart-and-redeploy)
9. [Setup GitHub Secrets](#9-setup-github-secrets)
10. [How CI/CD Works](#10-how-cicd-works)
11. [AWS Security Group — Required Ports](#11-aws-security-group--required-ports)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites

| Requirement | Notes |
|---|---|
| Ubuntu 22.04 or 24.04 EC2 instance | t3.medium or larger recommended |
| Instance has a public IP or Elastic IP | Used in CORS config and email verification links |
| Git installed | `sudo apt-get install -y git` |
| Port 8080 open in Security Group | Backend API |
| SSH key pair | Used for GitHub Actions CI/CD |

---

## 2. Install Docker on Ubuntu EC2

SSH into your EC2 instance and run the following commands:

```bash
# Update packages
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine and Compose plugin
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Allow ubuntu user to run Docker without sudo
sudo usermod -aG docker ubuntu

# Apply group change without logging out
newgrp docker

# Verify
docker --version
docker compose version
```

> **Important:** After `usermod`, either run `newgrp docker` or log out and back in.
> If you skip this, docker commands will require `sudo`.

---

## 3. Clone the Repository

```bash
# Navigate to home directory
cd /home/ubuntu

# Clone the repository
git clone https://github.com/your-org/chatly-messaging-platform.git chatly

cd chatly
```

### If the repository is private

You have two options:

**Option A — Deploy key (recommended for CI/CD):**
```bash
# Generate a deploy key on EC2
ssh-keygen -t ed25519 -C "ec2-deploy" -f ~/.ssh/chatly_deploy -N ""

# Print the public key and add it to GitHub → Repo Settings → Deploy keys
cat ~/.ssh/chatly_deploy.pub

# Configure SSH to use this key for GitHub
cat >> ~/.ssh/config << 'EOF'
Host github.com
  IdentityFile ~/.ssh/chatly_deploy
  StrictHostKeyChecking no
EOF

# Clone using SSH
git clone git@github.com:your-org/chatly-messaging-platform.git chatly
```

**Option B — Personal Access Token:**
```bash
git clone https://<TOKEN>@github.com/your-org/chatly-messaging-platform.git chatly
```

---

## 4. Create the .env File

```bash
cd /home/ubuntu/chatly

# Copy the example file
cp .env.example .env

# Edit with your real values
nano .env
```

### Required values to fill in

| Variable | Description |
|---|---|
| `POSTGRES_PASSWORD` | Strong password for PostgreSQL |
| `REDIS_PASSWORD` | Strong password for Redis |
| `INTERNAL_API_KEY` | Shared secret — generate with `openssl rand -hex 32` |
| `APP_JWT_SECRET` | JWT signing key — generate with `openssl rand -base64 48` |
| `APP_CORS_ALLOWED_ORIGINS` | Frontend URL(s), e.g. `http://54.x.x.x,https://app.chatly.com` |
| `APP_AUTH_VERIFICATION_LINK_BASE_URL` | e.g. `http://54.x.x.x:8080/api/auth/verify-email` |
| `SPRING_MAIL_USERNAME` | Gmail address for sending emails |
| `SPRING_MAIL_PASSWORD` | Gmail App Password |
| `AWS_ACCESS_KEY` | AWS IAM key for S3 |
| `AWS_SECRET_KEY` | AWS IAM secret for S3 |
| `AWS_S3_BUCKET` | Your S3 bucket name |
| `GROQ_API_KEY` | Groq LLM API key |
| `HUGGINGFACE_API_KEY` | HuggingFace token for embeddings |
| `TAVILY_API_KEY` | Web search API key (optional) |

### First deploy: create tables automatically

In `.env`, set:
```bash
JPA_DDL_AUTO=update
```

After the first successful deploy and tables are created, change to:
```bash
JPA_DDL_AUTO=validate
```

Then redeploy: `docker compose up -d --build backend`

---

## 5. Build and Run with Docker Compose

```bash
cd /home/ubuntu/chatly

# Build all images and start all services in detached mode
docker compose up -d --build
```

Docker Compose starts services in dependency order:

```
postgres, mongodb, redis, qdrant
         ↓
      ai-agent
         ↓
       backend
```

The first build takes 5–15 minutes (Maven downloads ~200 MB of dependencies, UV resolves Python packages). Subsequent builds use Docker layer cache and are much faster.

---

## 6. Verify the Deployment

```bash
# Check all containers are running (should show "healthy" for all)
docker compose ps

# Test backend health endpoint
curl http://localhost:8080/actuator/health

# Test AI Agent health (internal only — from within EC2)
curl http://localhost:8000/health/
```

Expected backend response:
```json
{"status":"UP"}
```

Expected AI Agent response:
```json
{"status":"ok"}
```

---

## 7. View Logs

```bash
# All services — live tail
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f ai-agent
docker compose logs -f postgres

# Last 100 lines of a service
docker compose logs --tail=100 backend
```

---

## 8. Restart and Redeploy

### Restart a single service

```bash
docker compose restart backend
docker compose restart ai-agent
```

### Full redeploy after code changes

```bash
cd /home/ubuntu/chatly

git pull origin main
docker compose down
docker compose up -d --build
docker compose ps
```

### Rebuild only changed services

```bash
# Rebuild and restart backend only (faster if agent code unchanged)
docker compose up -d --build backend
```

### Stop everything

```bash
docker compose down
```

### Stop and remove volumes (WARNING: deletes all data)

```bash
docker compose down -v
```

---

## 9. Setup GitHub Secrets

In your GitHub repository, go to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret Name | Value | Example |
|---|---|---|
| `EC2_HOST` | Public IP or DNS of your EC2 instance | `54.123.45.67` |
| `EC2_USER` | SSH username | `ubuntu` |
| `EC2_SSH_KEY` | **Full content** of the EC2 private key file | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `EC2_PROJECT_PATH` | Absolute path to the project on EC2 | `/home/ubuntu/chatly` |

### Getting the SSH private key

If you created the EC2 instance with a key pair, download the `.pem` file from AWS.
The content of that `.pem` file is the value for `EC2_SSH_KEY`.

```bash
# On your local machine — print the key content to copy
cat ~/.ssh/your-ec2-key.pem
```

Copy the **entire output** including the `-----BEGIN` and `-----END` lines and paste it as the secret value.

> **Security:** The private key never leaves GitHub's encrypted secret store.
> It is injected into the runner environment during the workflow and discarded after.

---

## 10. How CI/CD Works

The workflow at [.github/workflows/deploy-backend-agent.yml](.github/workflows/deploy-backend-agent.yml) triggers automatically when code is pushed or merged into `main`, but **only if** the changed files include:

- `chatly-backend/**` (any backend source file)
- `chatly-agent/**` (any agent source file)
- `docker-compose.yml`
- `.env.example`
- `.github/workflows/deploy-backend-agent.yml`

### Workflow steps

```
1. Checkout source code on GitHub runner
2. SSH into EC2 using EC2_SSH_KEY
3. cd EC2_PROJECT_PATH
4. git pull origin main         ← pull latest code
5. docker compose down          ← stop old containers
6. docker compose up -d --build ← build new images and start
7. docker compose ps            ← print status
```

If any step fails, a second SSH step runs to print the last 80 lines of logs from `backend` and `ai-agent`.

### Verify CI/CD after pushing to main

1. Push a change to any backend or agent file on `main`.
2. Go to **GitHub → Actions tab** of your repository.
3. Find the **"Deploy Backend & AI Agent to EC2"** workflow run.
4. Watch the logs — all steps should show green checkmarks.
5. After the run completes, SSH into EC2 and run: `docker compose ps`

---

## 11. AWS Security Group — Required Ports

Configure these **inbound rules** in your EC2 Security Group:

| Port | Protocol | Source | Purpose |
|---|---|---|---|
| `22` | TCP | Your IP (or `0.0.0.0/0` for GitHub Actions) | SSH access |
| `8080` | TCP | `0.0.0.0/0` | Backend REST API (public) |

**Do NOT open these ports externally** (they are internal to Docker network):

| Port | Service | Why internal only |
|---|---|---|
| `8000` | AI Agent | Called by Backend only, never by clients |
| `5432` | PostgreSQL | Managed by Docker network |
| `27017` | MongoDB | Managed by Docker network |
| `6379` | Redis | Managed by Docker network |
| `6333/6334` | Qdrant | Managed by Docker network |

If your frontend is served from a separate server/CDN, add its origin to `APP_CORS_ALLOWED_ORIGINS` in `.env`.

---

## 12. Troubleshooting

### Port 8080 not accessible from browser

**Symptom:** `curl http://<EC2-IP>:8080/actuator/health` times out.

**Fix:** Open port 8080 in the AWS Security Group inbound rules for your EC2 instance.

---

### Backend cannot connect to AI Agent (`Connection refused`)

**Symptom:** Backend logs show `Connection refused` when calling `localhost:8000`.

**Cause:** The backend is using `localhost` instead of the Docker service name.

**Fix:** This is already handled by the root `docker-compose.yml` which sets `AGENT_BASE_URL=http://ai-agent:8000`. Verify this env var is not overridden in your `.env` file. Run:
```bash
docker compose exec backend env | grep AGENT_BASE_URL
# Should print: AGENT_BASE_URL=http://ai-agent:8000
```

---

### Wrong environment variable

**Symptom:** Spring Boot fails to start with `Could not resolve placeholder '${SOME_VAR}'`.

**Fix:**
1. Check that `.env` exists in the project root on EC2.
2. Verify the missing variable is defined: `grep SOME_VAR .env`
3. After editing `.env`, redeploy: `docker compose up -d --build backend`

---

### Container keeps restarting (`restarting` state in `docker compose ps`)

**Symptom:** `docker compose ps` shows a service in `restarting` state.

**Diagnosis:**
```bash
docker compose logs --tail=50 <service-name>
```

**Common causes:**
- Missing required env var (see above)
- Database not ready yet (increase `start_period` if needed, or wait and retry)
- Out of memory — check instance size and `JAVA_OPTS` in `chatly-backend/Dockerfile`
- Port conflict — check if another process uses port 8080: `sudo ss -tlnp | grep 8080`

---

### Database not accessible from EC2

**Symptom:** Backend cannot connect to PostgreSQL or MongoDB.

**Fix:** The databases run inside Docker containers on the same `chatly-net` network.
They are accessed by service name (`postgres`, `mongodb`), not by EC2's IP or `localhost`.
Verify the backend container can reach the database:
```bash
docker compose exec backend curl -s postgres:5432 || echo "port check"
# Or check env vars
docker compose exec backend env | grep DATABASE_URL
```

---

### Docker permission denied on Ubuntu

**Symptom:** `permission denied while trying to connect to the Docker daemon socket`

**Fix:**
```bash
sudo usermod -aG docker ubuntu
newgrp docker
# Or log out and SSH back in
```

---

### GitHub Actions cannot SSH into EC2

**Symptom:** Workflow step "Deploy via SSH" fails with `Connection refused` or `Permission denied (publickey)`.

**Checklist:**
1. Verify port 22 is open in the Security Group for `0.0.0.0/0` (GitHub Actions uses dynamic IPs).
2. Verify `EC2_HOST` secret contains only the IP/hostname, no `ubuntu@` prefix.
3. Verify `EC2_USER` is `ubuntu` (the default user for Ubuntu AMIs).
4. Verify `EC2_SSH_KEY` contains the **full** private key content, including header/footer lines.
   - Test locally: `ssh -i /tmp/key.pem ubuntu@<EC2_HOST> "echo OK"` (save secret value to `/tmp/key.pem` first, `chmod 600 /tmp/key.pem`)

---

### Wrong EC2_PROJECT_PATH

**Symptom:** Workflow fails with `No such file or directory`.

**Fix:** Verify the path on EC2:
```bash
ls /home/ubuntu/chatly/docker-compose.yml
```
The `EC2_PROJECT_PATH` secret should be the directory containing `docker-compose.yml`, e.g., `/home/ubuntu/chatly`.

---

### EC2 cannot pull private GitHub repository

**Symptom:** `git pull` inside the workflow fails with `Authentication failed`.

**Fix:** The workflow SSH action runs as the `ubuntu` user on EC2. Configure a deploy key:
```bash
# On EC2
ssh-keygen -t ed25519 -C "chatly-ec2-deploy" -f ~/.ssh/deploy_key -N ""
cat ~/.ssh/deploy_key.pub
# Add this public key to GitHub → Repo → Settings → Deploy keys (read-only is enough)

cat >> ~/.ssh/config << 'EOF'
Host github.com
  IdentityFile /home/ubuntu/.ssh/deploy_key
  StrictHostKeyChecking no
EOF
```

---

### `docker compose` command not found

**Symptom:** `docker compose: command not found` or `unknown command "compose"`.

**Cause:** Older Docker installations use `docker-compose` (with hyphen) as a separate binary.

**Fix A — Install Docker Compose plugin (recommended):**
```bash
sudo apt-get install -y docker-compose-plugin
docker compose version  # verify
```

**Fix B — Use the legacy binary:**
```bash
sudo apt-get install -y docker-compose
docker-compose version  # verify
# Then use docker-compose instead of docker compose in all commands
```

In the GitHub Actions workflow, update the script lines to use `docker-compose` instead of `docker compose` if using option B.

---

### Qdrant healthcheck fails / container unhealthy

**Symptom:** `chatly-qdrant` stays unhealthy and AI Agent won't start.

**Fix:** Qdrant may take longer to initialize on first launch. Increase the `start_period`:
```yaml
# In docker-compose.yml
qdrant:
  healthcheck:
    start_period: 30s
```

Or manually wait and restart:
```bash
docker compose restart qdrant
sleep 15
docker compose ps
```
