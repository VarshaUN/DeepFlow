# DeepFlow

**DeepFlow** is a Chrome extension that preserves your browser context so you never lose your flow during deep work.

Save your open tabs with an optional note, restore them later, share working context with teammates, and track your deep-work momentum through streaks and badges.

Built with WXT, React, TypeScript, Chrome Extension APIs, and Supabase.

## Features

- Enter Focus Mode and auto-save your current browser context
- Save open tabs manually with a custom note
- Restore saved sessions
- Share saved contexts with another DeepFlow user by email
- Receive shared contexts in a Shared inbox
- Restore shared sessions
- Save a shared session as your own context
- Append your current tabs onto a shared session and create a derived context
- Share derived contexts onward
- Track activity, streaks, and badges
- Local fallback with `chrome.storage.local`
- Supabase-backed auth, sync, collaboration, and activity storage

## Prerequisites

- Google Chrome or another Chromium-based browser
- Node.js 18+ and npm
- Git
- A Supabase project

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/deepflow-proto.git
cd deepflow-proto
```

Replace `YOUR_USERNAME` with your GitHub username or the correct repository owner.

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Supabase

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

You can find these values in Supabase under:

```txt
Project Settings -> Data API
```

Use the project URL without `/rest/v1/`.

### 4. Run the Database Schema

Open Supabase SQL Editor and run:

```txt
supabase/schema.sql
```

This creates the required tables, RLS policies, auth profile trigger, and starter badges.

### 5. Start the Development Server

```bash
npm run dev
```

### 6. Load the Extension in Chrome

1. Open Chrome.
2. Go to `chrome://extensions/`.
3. Turn on Developer mode.
4. Click Load unpacked.
5. Select:

```txt
.output/chrome-mv3-dev
```

6. Pin DeepFlow from the Chrome extensions menu.

## How to Test

### Local Context Saving

1. Open several tabs.
2. Open the DeepFlow popup.
3. Save a context.
4. Restore it.
5. Delete it.

This should work even before signing in.

### Supabase Auth

1. Open the Account page from the popup header.
2. Sign up or sign in.
3. Save a context.
4. Confirm a row appears in Supabase `sessions`.

### Sharing

1. Sign in as User A.
2. Save a context.
3. Share it with User B's email.
4. Sign in as User B.
5. Open the Shared tab.
6. Restore the shared context.
7. Save it as your own or append current tabs.

### Streaks and Badges

Perform actions such as saving, restoring, sharing, entering focus mode, and appending shared contexts. Then open the Streaks tab to see activity, contribution grid updates, and unlocked badges.

## Supabase Tables

The schema creates:

- `profiles`
- `sessions`
- `shared_sessions`
- `activity_events`
- `daily_activity`
- `badges`
- `user_badges`

## Tech Stack

- WXT
- React
- TypeScript
- Chrome Extension APIs
- Supabase Auth
- Supabase Postgres
- Supabase Realtime
