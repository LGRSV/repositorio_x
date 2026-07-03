FROM python:3.13-slim

WORKDIR /app
COPY app.py.part.* /tmp/repository_x_parts/
RUN cat /tmp/repository_x_parts/app.py.part.* > /app/app.py \
    && rm -rf /tmp/repository_x_parts \
    && useradd --create-home --uid 10001 appuser \
    && mkdir -p /app/data/uploads \
    && chown -R appuser:appuser /app

USER appuser
ENV PYTHONUNBUFFERED=1 \
    PORT=8080 \
    DATA_DIR=/app/data
EXPOSE 8080
VOLUME ["/app/data"]
CMD ["python", "app.py"]
