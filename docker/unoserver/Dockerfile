# Sidecar: dedicated LibreOffice conversion service (unoserver) for Deep Dive
# PPTX playback. Only this image carries LibreOffice's footprint — the main
# backend image stays lean and talks to this over the compose network via
# the unoconvert client (server/src/deepDive/pptxConverter.js).
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        libreoffice-impress fonts-noto-cjk python3-pip python3-uno \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --break-system-packages --no-cache-dir unoserver

EXPOSE 2003

CMD ["unoserver", "--interface", "0.0.0.0", "--port", "2003"]
