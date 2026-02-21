#!/bin/bash
set -e
echo "🚀 Arrancando infraestructura..."
cd /home/kai/infrastructure/traefik && docker compose up -d
echo "🏗️ Construyendo y arrancando kai-doc-pwa..."
cd /home/kai/projects/kai-doc-pwa && docker compose up -d --build
echo "✅ kai-doc-pwa disponible en http://localhost"
