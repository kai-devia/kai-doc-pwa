#!/bin/bash
set -e
echo "🏗️ Construyendo y arrancando kai-doc-pwa..."
cd /home/kai/projects/kai-doc-pwa && docker compose up -d --build
echo "✅ kai-doc-pwa disponible en http://localhost"
echo ""
echo "📝 Credenciales:"
echo "   Usuario: guille"
echo "   Password: erythia2026"
