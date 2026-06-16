# Common Errors & Fixes — Migrate Node.js + Express + Sequelize sang TypeScript

> File này là ghi chú tham khảo (không phải code chạy được). Được chuyển từ
> `src/types/COMMON_ERRORS.ts` sang Markdown vì `tsc` cố compile nó như source
> code thật, gây lỗi cú pháp (các đoạn ví dụ dùng `...` làm placeholder).

## Lỗi 1: `Property 'user' does not exist on type 'Request'`

```ts
// ❌ Lỗi
app.get('/profile', (req: Request, res: Response) => {
  const userId = req.user.id; // Error: Property 'user' does not exist
});
```

✅ Fix: Tạo `src/types/express.d.ts` với nội dung:

```ts
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: string;
      };
    }
  }
}
```

Sau đó dùng `req.user!` (non-null assertion) hoặc kiểm tra null.

## Lỗi 2: `Could not find a declaration file for module 'express'`

```ts
// ❌ Lỗi
import express from 'express'; // Error: Could not find declaration file
```

✅ Fix:
```bash
npm install --save-dev @types/express @types/node
```
Và đảm bảo `tsconfig.json` có `"esModuleInterop": true`.

## Lỗi 3: Sequelize model instance methods không có type

```ts
// ❌ Lỗi
const course = await Course.findByPk(id);
course.instructor.name;   // Error: Object is possibly 'undefined'
course.update({ title }); // Works but no type check on fields
```

✅ Fix: Thêm optional chaining + typing:

```ts
const course = await Course.findByPk(id, {
  include: [{ model: User, as: 'instructor' }]
});
if (!course) return res.status(404).json({ message: 'Not found' });
course.instructor?.name; // ✅ Safe
```

Và khai báo associations trong model:
```ts
public instructor?: User; // trong Course class
```

## Lỗi 4: `Argument of type 'string | undefined' is not assignable to type 'string'`

```ts
// ❌ Lỗi
const { email } = req.body; // email: string | undefined (khi chưa type body)
const user = await User.findOne({ where: { email } }); // Error
```

✅ Fix option 1 — Type the Request body:
```ts
router.post('/', async (req: Request<{}, {}, { email: string }>, res, next) => {
  const { email } = req.body; // email: string ✅
});
```

✅ Fix option 2 — Type assertion (nhanh hơn khi migrate):
```ts
const email = req.body.email as string;
```

## Lỗi 5: BIGINT từ Sequelize trả về string thay vì number

```ts
// ❌ Vấn đề
const expiry = auth.otp_expiry; // Type: bigint | null
Date.now() > expiry; // Error: Operator '>' cannot be applied to 'bigint' and 'number'
```

✅ Fix: Convert sang Number:
```ts
const isExpired = Date.now() > Number(auth.otp_expiry ?? 0);
```

## Lỗi 6: `Cannot use namespace 'Sequelize' as a type`

```ts
// ❌ Lỗi khi import
import Sequelize from 'sequelize';
const { Op } = Sequelize; // Error
```

✅ Fix: Named import:
```ts
import { Sequelize, Op, DataTypes } from 'sequelize';
```

## Lỗi 7: Circular imports giữa models

```ts
// ❌ Lỗi: User import Course, Course import User → circular
import { Course } from './Course'; // trong User.ts → circular!
```

✅ Fix: Dùng dynamic import types (chỉ cho TypeScript, không runtime):
```ts
type CourseModel = import('./Course').Course;
```

Hoặc tách `ModelsMap` ra file riêng: `src/types/models.types.ts` — chỉ chứa interface, không import models.

## Lỗi 8: `This expression is not callable` với middleware chain

```ts
// ❌ Lỗi
router.post('/', authMiddleware, authorize(['admin']), async (req, res) => {
  // Error: This expression is not callable...
});
```

✅ Fix: Đảm bảo `authorize` return đúng type:
```ts
import { RequestHandler } from 'express';

export function authorize(roles: string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    // ...
    next();
  };
}
```

## Lỗi 9: `bcrypt.hash` return type

```ts
// ❌ Có thể gặp
import bcrypt from 'bcrypt'; // Error nếu chưa có @types/bcrypt
```

✅ Fix:
```bash
npm install --save-dev @types/bcrypt
```
```ts
const hash: string = await bcrypt.hash(password, 10); // ✅ typed
```

## Lỗi 10: Multer upload type không match

```ts
// ❌ Lỗi
router.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) { /* Error: Property 'file' does not exist on Request */ }
});
```

✅ Fix:
```bash
npm install --save-dev @types/multer
```
`req.file` tự có type sau khi cài `@types/multer`.

## Tips chung

1. Bắt đầu với `"strict": false` trong `tsconfig`, bật dần sau khi convert xong.
2. Dùng `// @ts-ignore` hoặc `// @ts-expect-error` tạm thời để unblock progress khi gặp lỗi khó fix.
3. Thứ tự convert an toàn nhất: `types/` → `utils/` → `middleware/` → `services/` → `models/` → `routes/` → `app.ts`.
4. Test từng file sau khi convert: `npx tsc --noEmit` (không build, chỉ check type).
5. Giữ `.js` backup nếu cần rollback:
   ```bash
   git branch feat/ts-migration
   # commit từng bước nhỏ
   ```