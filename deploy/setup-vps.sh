#!/bin/bash
set -euo pipefail

cd /home/cnerp

# --- DB URL from IEAS ---
IEAS_DB=$(grep '^DATABASE_URL=' /home/IEAS/.env | head -1 | cut -d= -f2- | tr -d '"')
CNERP_DB=$(echo "$IEAS_DB" | sed 's#/ieas?#/cnerp?#; s#/ieas$#/cnerp#')

# Create database if missing
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='cnerp'" | grep -q 1; then
  sudo -u postgres createdb cnerp
  echo "created database cnerp"
else
  echo "database cnerp already exists"
fi

JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)

cat > /home/cnerp/.env <<EOF
NODE_ENV=production
API_PORT=4050
API_PREFIX=api/v1
CORS_ORIGIN=https://cnerp.dosutech.site
DATABASE_URL=${CNERP_DB}
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=8h
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_REFRESH_EXPIRES_IN=7d
VITE_API_BASE_URL=https://api-cnerp.dosutech.site/api/v1
SEED_ADMIN_EMAIL=admin@cnerp.local
SEED_ADMIN_PASSWORD=Admin@123
HTTPS=true
EOF

cp /home/cnerp/.env /home/cnerp/apps/api/.env
echo "env ok"

cd /home/cnerp
npm install
npm run build -w @cnerp/shared
npm run db:generate
cd /home/cnerp/apps/api
npx prisma migrate deploy
npx prisma db seed
cd /home/cnerp
npm run build -w @cnerp/api
# Build web with production API URL
export VITE_API_BASE_URL=https://api-cnerp.dosutech.site/api/v1
npm run build -w @cnerp/web

# PM2
pm2 delete cnerp-api 2>/dev/null || true
cd /home/cnerp
pm2 start ecosystem.config.js
pm2 save

# Nginx HTTP first (cert later)
ln -sfn /home/cnerp/deploy/api-cnerp.dosutech.site.conf.http /etc/nginx/sites-enabled/api-cnerp.dosutech.site.conf
ln -sfn /home/cnerp/deploy/cnerp.dosutech.site.conf.http /etc/nginx/sites-enabled/cnerp.dosutech.site.conf
nginx -t && systemctl reload nginx

echo "=== DONE ==="
pm2 describe cnerp-api | head -20
curl -s http://127.0.0.1:4050/api/v1/health || true
