# Full Stack Exam Platform

Production-ready online exam platform built with React, Express, MongoDB, and JWT authentication.

## Tech Stack

- React + Vite
- Tailwind CSS
- React Router
- Context API
- Node.js + Express
- MongoDB + Mongoose
- JWT + bcrypt

## Run Locally

1. Create environment files:
   - `server/.env`
   - `client/.env`
2. Install dependencies:

```bash
npm install
```

3. Start both apps:

```bash
npm run dev
```

## Default Ports

- Client: `http://localhost:5173`
- Server: `http://localhost:5000`

## Firebase Auth Setup

Client environment values in `client/.env`:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

Server environment values in `server/.env` or Render:

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

For `FIREBASE_PRIVATE_KEY`, paste the Firebase service account private key as a single line and keep escaped newlines, for example:

```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nABC123...\n-----END PRIVATE KEY-----\n"
```

## Production Deploy Notes

- Render backend env must include `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, and the Firebase server vars above.
- Vercel frontend env must include `VITE_API_BASE_URL` and the Firebase client vars above.
- Google login and phone OTP work only after both the Firebase client config and Firebase Admin server config are set.
