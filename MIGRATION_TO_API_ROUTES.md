# Option 1: Migrate Backend to Next.js API Routes - Implementation Guide

This is the **quickest and easiest** solution to get your backend working on Render.

---

## Step 1: Create API Routes Structure

Create these directories:
```
src/app/api/
├── auth/
│   ├── register/route.ts
│   ├── login/route.ts
│   ├── logout/route.ts
│   └── profile/route.ts
├── trading/
│   └── route.ts
├── signals/
│   └── route.ts
└── health/
    └── route.ts
```

---

## Step 2: Migrate Authentication Endpoints

**Create**: `src/app/api/auth/register/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { executeQuery } from '@/backend/database/connection';
import { cacheService } from '@/backend/database/redis';

export async function POST(req: NextRequest) {
  try {
    const { username, email, password, firstName, lastName } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Username, email, and password are required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await executeQuery(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const result = await executeQuery(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, username, email, first_name, last_name, created_at`,
      [username, email, hashedPassword, firstName, lastName]
    );

    const user = result[0];
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    // Cache session
    await cacheService.setUserSession(user.id, {
      userId: user.id,
      username: user.username,
      email: user.email,
      token
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name
        },
        token
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}
```

---

## Step 3: Similar Endpoints

Migrate these endpoints the same way:

- `POST /api/auth/login` - from `backend/api/users.ts` login endpoint
- `POST /api/auth/logout` - from `backend/api/users.ts` logout endpoint
- `GET /api/auth/profile` - from `backend/api/users.ts` profile endpoint
- `PUT /api/auth/preferences` - from `backend/api/users.ts` preferences endpoint

---

## Step 4: Update Frontend API Calls

**Current** (won't work):
```typescript
const response = await fetch('http://localhost:3001/api/users/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});
```

**New** (after migration):
```typescript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});
```

---

## Step 5: Create Environment Variables

**Update** `.env`:
```env
# Keep existing vars + add Next.js specific:
NEXT_PUBLIC_API_URL=/api
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=https://upstash-rest-url
JWT_SECRET=your_secret
```

---

## Step 6: Test Locally

```bash
npm install
npm run dev
# Test at http://localhost:3000/api/auth/register
```

---

## Step 7: Deploy to Render

1. No changes needed to Render configuration
2. Single `npm start` command runs everything
3. Both frontend + backend on same port

---

## Advantages

✅ Single deployment
✅ Same port (3000)
✅ Automatic hot reload
✅ Same Node environment
✅ Easier debugging
✅ No CORS issues

---

## Disadvantages

⚠️ Larger deployment bundle
⚠️ Backend can't scale independently
⚠️ Requires full refactor

---

## Files to Keep

You can keep your `/backend` folder as reference but won't use it in production.

---

## Migration Checklist

- [ ] Create `/src/app/api/` directory structure
- [ ] Copy user authentication endpoints
- [ ] Copy trading/signals endpoints
- [ ] Copy middleware (auth, error handling)
- [ ] Update all frontend API calls to use `/api/` paths
- [ ] Test all endpoints locally
- [ ] Update `.env` variables
- [ ] Deploy to Render
- [ ] Test on production URL

---

## Quick Start

Want to start immediately? Here's the minimum:

1. Copy your `/backend/database` folder to `/src/lib/database`
2. Create `/src/app/api/auth/login/route.ts` with the login logic
3. Update frontend to call `/api/auth/login`
4. Deploy

That's it! Add more endpoints as needed.
