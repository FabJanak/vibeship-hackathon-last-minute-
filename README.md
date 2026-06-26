# The Last-Minute Life Saver: Proactive AI-Powered Productivity Companion

Welcome to the **Last-Minute Life Saver**, an immersive, active productivity companion designed to turn unstructured daily chaos into a structured, executable plan. Instead of forcing you through tedious manual form-entry, the application provides an **"AI Inbox Rescue"** where you can dump raw thoughts, messy text fragments, or voice notes. 

This document contains a comprehensive breakdown of the application's problem statement, features, system architecture, database schema, API endpoints, and a detailed guide on how to configure and deploy the project.

---

## Table of Contents
1. [Problem Statement](#1-problem-statement)
2. [Solution Overview](#2-solution-overview)
3. [Key Features](#3-key-features)
4. [System Architecture](#4-system-architecture)
5. [Technologies & Tools Used](#5-technologies--tools-used)
6. [Detailed Code & File Walkthrough](#6-detailed-code--file-walkthrough)
7. [Database & Storage Schema](#7-database--storage-schema)
8. [Configuration & Environment Variables](#8-configuration--environment-variables)
9. [Running the Application Locally](#9-running-the-application-locally)
10. [Google Calendar Integration & Sandbox Mode Troubleshooting](#10-google-calendar-integration--sandbox-mode-troubleshooting)

---

## 1. Problem Statement
Students, professionals, and entrepreneurs frequently miss deadlines and critical commitments due to passive notification fatigue. Traditional productivity tools rely on manual, rigid task entry and static alerts that are easily ignored. They offer zero context-aware task triage or cognitive offloading, leaving users feeling overwhelmed and anxious when plans change.

---

## 2. Solution Overview
The **Last-Minute Life Saver** acts as an intelligent, active buffer between chaotic reality and your calendar.
* **Semantic Capture:** Instead of entering tasks manually, you write a stream of consciousness ("AI Inbox Rescue").
* **Cognitive Offloading:** The system automatically extracts tasks, estimates time requirements, calculates urgency, and rates your total daily schedule risk.
* **Proactive Protection:** The application overlays these tasks onto real-time calendar gaps, ensuring you never double-book yourself and always know exactly what to do next.

---

## 3. Key Features

### 📥 AI Inbox Rescue (Messy Dump Triage)
* **What it is:** A single text input where you can dump raw, disorganized thoughts (e.g., *"I'm sick today, I have a history test at 4pm and need to buy medicine, also have to prep slides for tomorrow"*).
* **How it works:** The backend leverages **Gemini 3.5 Flash** with custom-crafted system prompts to execute advanced entity extraction, semantic triage, effort estimations, and chronological ordering.
* **The Result:** Instantly converts unstructured venting into discrete, structured, and cataloged database tasks.

### 📅 Dynamic Priority Schedule Planner
* **What it is:** A smart time-blocking schedule that respects your time.
* **How it works:** Integrates with Google Calendar to fetch existing events, which are treated as "immutable blocks". The remaining pending tasks are chronologically allocated inside the available empty slots of your day.

### 🚨 Adaptive Risk Center
* **What it is:** A real-time cognitive workload evaluation dashboard.
* **How it works:** Evaluates your hourly schedule density and calculates an overall **Daily Schedule Risk Score (0–100%)**.
* **Smart Interventions:** When an overload condition is detected (e.g. density > 80%), the system provides dynamic, context-aware AI advice suggesting delegation, task postponement, or optimal micro-breaks to avoid burnout.

### ⚡ Actionable Next Best Action
* **What it is:** Zero-decision fatigue interface.
* **How it works:** Boldly highlights the single, high-priority, imminent task that requires your immediate focus, explaining *why* it is prioritized (e.g. due to deadline proximity or slot availability).

### 🏆 Goal & Habit Trackers
* **What it is:** Long-term behavior reinforcement panels.
* **How it works:** Allows users to track recurring habits (e.g., water, exercise, meditation) and overarching goals alongside their high-pressure daily schedules, reminding them to stay grounded.

---

## 4. System Architecture

The application is structured as a robust **Full-Stack App (Express + Vite + React)**:

```
                +---------------------------------------+
                |           React Client (SPA)          |
                |   - AI Inbox UI, Calendar Dashboard   |
                |   - Real-time Firestore Sync          |
                |   - Firebase Auth (Google Sign-In)    |
                +-------------------+-------------------+
                                    |
                                    | Secure HTTPS Proxy
                                    v
                +-------------------+-------------------+
                |            Express Server             |
                |   - Port 3000 Ingress Control         |
                |   - Gemini SDK (API Key Protection)   |
                |   - Google Calendar OAuth Exchange    |
                +---------+-------------------+---------+
                          |                   |
                          v                   v
                +---------+---------+  +------+-----------------+
                |   Gemini 3.5 API  |  |   Google Calendar API  |
                |  Entity Extraction|  |   Free/Busy & Events   |
                +-------------------+  +------------------------+
```

### Server Security Model
To prevent API keys and OAuth secrets from leaking to the browser, all sensitive interactions (such as communication with the Gemini SDK or token exchanges with Google Calendar) are proxied through server-side endpoints in `server.ts`.

---

## 5. Technologies & Tools Used

* **Frontend:**
  * **React 18** (Vite-powered, structured cleanly for performance).
  * **Tailwind CSS** (Utility classes with custom color schemes, deep slate-themed elements, and beautiful typographic hierarchy).
  * **Motion/React** (Hardware-accelerated micro-animations for task completion, slide-overs, and fade-in states).
  * **Lucide React** (Vector iconography).
* **Backend:**
  * **Express Server** with Node.js.
  * **TypeScript & tsx** for fast, typesafe server execution.
  * **Esbuild** (Bundles the server code cleanly into `dist/server.cjs` for production runtime).
* **Database & Auth:**
  * **Firebase Firestore** (Durable cloud storage, synchronized in real-time).
  * **Firebase Authentication** (Google Auth with secure credential storage).
* **Google Technologies:**
  * **Gemini API** (`@google/genai` SDK using `gemini-3.5-flash`).
  * **Google Calendar API** (Client-side and server-side OAuth flow integration).

---

## 6. Detailed Code & File Walkthrough

### 📂 File Structure
* **`server.ts`**: The central application entry point. Serves API routes for AI task parsing and handles the Vite middleware in development. In production, serves static client assets from `dist/` and runs on port `3000`.
* **`src/App.tsx`**: The main React layout. Orchestrates application states, houses the inbox dump component, displays the risk gauges, and connects to Firebase.
* **`src/lib/firebase.ts`**: Contains Firestore listeners, initialization logic, and helpers to add/update/delete tasks synchronously.
* **`src/types.ts`**: Holds TypeScript definitions for `Task`, `CalendarEvent`, `Goal`, `Habit`, and `AIInboxRescueResponse` to guarantee compile-time type safety.
* **`vite.config.ts`**: Vite configuration containing aliases and asset bundling behaviors.
* **`package.json`**: Script definitions:
  * `npm run dev`: Fires up the development server using `tsx`.
  * `npm run build`: Compiles the React application to `dist/` and compiles/bundles `server.ts` to `dist/server.cjs` using `esbuild`.
  * `npm run start`: Boots the production-optimized build using Node.

---

## 7. Database & Storage Schema

Data is stored in **Firebase Firestore** under two main parent collections:

### 1. `users` (Metadata Collection)
```json
{
  "uid": "USER_ID_STRING",
  "email": "user@example.com",
  "displayName": "Jane Doe",
  "createdAt": "Timestamp"
}
```

### 2. `tasks` (Task Collection)
Each task has a reference to the owner's `userId` to maintain perfect security under Firestore rules:
```json
{
  "id": "AUTO_GENERATED_ID",
  "userId": "USER_ID_STRING",
  "title": "Study for History Test",
  "description": "Read chapters 4 and 5",
  "duration": 90, // in minutes
  "priority": "high", // "high" | "medium" | "low"
  "status": "pending", // "pending" | "completed"
  "category": "study",
  "isFixed": false, // true if it has a locked time
  "startTime": "2026-06-24T16:00:00Z", // optional
  "endTime": "2026-06-24T17:30:00Z", // optional
  "createdAt": "Timestamp"
}
```

---

## 8. Configuration & Environment Variables

Create a `.env` file in the root of your project using `.env.example` as a reference. Populate it with the following keys:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Gemini API Key (Server-side secret)
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Configuration (Exposed to the client)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

## 9. Running the Application Locally

Follow these steps to get the app running on your machine:

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
This starts the full-stack server on port `3000` with hot-reloading for the frontend enabled via Vite's middleware wrapper.
```bash
npm run dev
```

### 3. Build for Production
This builds the production static assets and compiles the server into a bundle:
```bash
npm run build
```

### 4. Start Production Server
Runs the optimized web server handling both the API endpoints and front-end delivery:
```bash
npm run start
```

---

## 10. Google Calendar Integration & Sandbox Mode Troubleshooting

When connecting Google Calendar, you might occasionally see the warning:
> **"Calendar Sync failed. You can still use Last-Minute Life Saver to manage and auto-schedule tasks."**

### Why does this happen?
To connect to real Google Calendar accounts, the application uses **Google OAuth 2.0 Client credentials**. By default, all newly created Google Cloud projects operate in a **"Sandbox/Testing"** state.

While in Sandbox mode:
1. **Developer Restrictions:** Google strictly blocks calendar token requests for any Google Account *not explicitly registered* as a "Test User" in the project's Google Cloud Console OAuth consent settings.
2. **Standard Active Mode:** The application is architected to fail gracefully. If the Calendar API cannot be authorized, **the app activates its Guest/Local scheduler**. You can still add, drag-and-drop, track tasks, view priority guidelines, and run the AI Inbox Rescue perfectly.

### How to resolve it in Google Cloud Console:
1. Navigate to the **Google Cloud Console** -> **APIs & Services** -> **OAuth Consent Screen**.
2. Locate the **Test Users** section.
3. Click **Add Users** and enter your Google account email address.
4. Re-authorize your calendar from the application. The synchronization will immediately succeed!

---

*Enjoy a stress-free day, powered by the Last-Minute Life Saver!*
