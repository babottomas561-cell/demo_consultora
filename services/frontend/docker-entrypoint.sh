#!/bin/sh
# Inyecta la API URL en runtime
API_URL=${API_URL:-http://localhost:8000}
sed -i "s|__PLACEHOLDER_API_URL__|${API_URL}|g" /usr/share/nginx/html/index.html
exec nginx -g 'daemon off;'
