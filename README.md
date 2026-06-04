# Online Courses Backend (VietProDev Challenges)

## Requirements
- Docker Desktop (Windows)
- (Optional) Node.js 20+

## Run with Docker
```bash
docker compose up -d --build
```

### Health
- http://localhost:5000/health

### Swagger
- http://localhost:5000/api/docs

### Static demo pages
- http://localhost:5000/index.html

## Environment
The container uses:
- `DATABASE_URL=postgres://app:app@db:5432/online_courses`
- `JWT_SECRET=...`
- `TZ=Asia/Ho_Chi_Minh`

## Notes
- Database is PostgreSQL (database-first).
- ERD: `erd.png`
- DB scripts: `init.sql`, `sample_data.sql`