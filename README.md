# PayFlow — UPI Management System

A full-stack UPI payment simulator built with Next.js, Node.js, MongoDB, and Socket.io.
Real-time notifications, secure MPIN authentication, and a clean GPay-style UI.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, Tailwind CSS, TypeScript |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas |
| Real-time | Socket.io (WebSockets) |
| Auth | JWT + bcrypt |
| State | Zustand |
| Hosting | Vercel (frontend) + Render (backend) |

---

## Features

- Register with auto-generated UPI ID (e.g. `anshul4821@payflow`)
- Login with 6-digit MPIN
- Account locks after 5 wrong MPIN attempts (15 min)
- Send money with atomic debit/credit (MongoDB transactions)
- **Live notifications** when you receive money (Socket.io)
- Transaction history with filters (all/sent/received)
- QR code generation for your UPI ID
- Balance hide/show toggle
- Change MPIN from profile
- Fully responsive (mobile + desktop)

---

## Local Setup

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free) → https://cloud.mongodb.com
- Git

---

### 1. Clone the project

```bash
git clone https://github.com/YOUR_USERNAME/payflow.git
cd payflow
```

---

### 2. Setup Backend

```bash
cd backend
npm install
```

Create `.env` file:
```env
MONGODB_URI=mongodb+srv://payflowuser:payflow123@cluster0.abcde12345.mongodb.net/payflow?retryWrites=true&w=majority
JWT_SECRET=any_long_random_string_here_make_it_complex
PORT=5000
CLIENT_URL=http://localhost:3000
```

> Get MONGODB_URI from MongoDB Atlas → your cluster → Connect → Drivers

Start backend:
```bash
npm run dev
```
Backend runs on http://localhost:5000

---

### 3. Setup Frontend

```bash
cd ../frontend
npm install
```

Create `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

Start frontend:
```bash
npm run dev
```
Frontend runs on http://localhost:3000

---

## Deployment

### Deploy Backend → Render (Free)

1. Push your code to GitHub
2. Go to https://render.com → New → Web Service
3. Connect your GitHub repo, select the `backend` folder
4. Set:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add Environment Variables (same as your .env)
6. Deploy → copy the URL (e.g. `https://payflow-api.onrender.com`)

### Deploy Frontend → Vercel (Free)

1. Go to https://vercel.com → New Project
2. Import your GitHub repo, select `frontend` folder
3. Add Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://payflow-api.onrender.com
   NEXT_PUBLIC_SOCKET_URL=https://payflow-api.onrender.com
   ```
4. Deploy → your app is live!

---

## Project Structure

```
payflow/
├── backend/
│   ├── models/
│   │   ├── User.js           # User schema with MPIN hashing
│   │   └── Transaction.js    # Transaction schema
│   ├── routes/
│   │   ├── auth.js           # Register, Login
│   │   ├── users.js          # Profile, Search, Change MPIN
│   │   └── transactions.js   # Send money, History
│   ├── middleware/
│   │   └── auth.js           # JWT protection
│   └── server.js             # Express + Socket.io entry
│
└── frontend/
    └── src/
        ├── app/
        │   ├── page.tsx          # Root redirect
        │   ├── login/page.tsx    # Login screen
        │   ├── register/page.tsx # Register screen
        │   ├── dashboard/page.tsx # Home with balance + live notifs
        │   ├── send/page.tsx     # Send money (4-step flow)
        │   ├── history/page.tsx  # Transaction history
        │   └── profile/page.tsx  # QR code, change MPIN
        ├── components/
        │   └── layout/AppLayout.tsx  # Sidebar + mobile nav
        └── lib/
            ├── api.ts        # Axios client with JWT
            ├── socket.ts     # Socket.io client singleton
            └── store.ts      # Zustand auth store
```

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | /api/auth/register | Create account | No |
| POST | /api/auth/login | Login with MPIN | No |
| GET | /api/users/me | Get my profile | Yes |
| GET | /api/users/search?q= | Search by UPI ID/phone | Yes |
| PATCH | /api/users/change-mpin | Change MPIN | Yes |
| POST | /api/transactions/send | Send money | Yes |
| GET | /api/transactions/history | Transaction history | Yes |
| GET | /api/transactions/:id | Single transaction | Yes |

---

## Socket.io Events

| Event | Direction | Description |
|---|---|---|
| `user:online` | Client → Server | Register as online |
| `users:online` | Server → All | List of online user IDs |
| `transaction:received` | Server → Client | Live payment notification |

---

## Made by
Anshul Sharma | 2021/CTAE/042 | AI & Data Science, CTAE Udaipur
Software Engineering Lab (AI365) — UPI Management System
