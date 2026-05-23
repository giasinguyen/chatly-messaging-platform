# ─── Stage 1: build ───────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-jammy AS builder

WORKDIR /app

# Copy Maven wrapper and POM first — layer cache for dependencies
COPY mvnw mvnw.cmd pom.xml ./
COPY .mvn .mvn

RUN chmod +x mvnw

# Download all dependencies before copying source — speeds up rebuilds
RUN ./mvnw dependency:go-offline -q

# Copy source code
COPY src ./src

# Build fat JAR, skip tests (tests run in CI separately)
RUN ./mvnw package -DskipTests -q

# ─── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-jammy AS runtime

# Install curl for healthcheck
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Non-root user for security
RUN useradd --create-home --no-log-init --shell /bin/bash appuser

WORKDIR /app

COPY --from=builder /app/target/*.jar app.jar

RUN chown appuser:appuser app.jar

USER appuser

# Container-aware JVM memory settings
ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseContainerSupport -Djava.security.egd=file:/dev/./urandom"

EXPOSE 8080

# Spring Boot Actuator health endpoint — waits 90s for DB init before checking
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=5 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
