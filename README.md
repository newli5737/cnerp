# CNERP — 中越商贸 ERP

ERP mini vận hành: bán hàng · kho · công nợ · thống kê. Song ngữ Trung–Việt.

## Tech

- NestJS 11 + Prisma 6 + PostgreSQL
- React 18 + Vite 6 + Ant Design 5 + i18next
- JWT cookie auth, phân quyền động (RBAC)

## Quick start

```bash
# Tạo DB
createdb cnerp   # hoặc dùng pgAdmin / psql

cp .env.example .env
npm install
npm run build -w @cnerp/shared
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

- Web: http://localhost:5173  
- API: http://localhost:4050/api/v1  
- Swagger: http://localhost:4050/api/docs  

Seed: `admin@cnerp.local` / `Admin@123`

# cnerp

