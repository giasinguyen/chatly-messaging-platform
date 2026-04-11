FROM python:3.12-slim
WORKDIR /app
COPY server.py .
EXPOSE 8080
ENV PYTHONUNBUFFERED=1
CMD ["python", "-u", "server.py"]
