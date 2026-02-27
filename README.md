# DeepFlow 

**DeepFlow** is a Chrome extension that preserves your browser context (open tabs + optional note) so you never lose your flow during deep work.  
One-click "Enter Focus Mode" auto-saves everything — interrupt as much as you want — then restore instantly later.

Built as a 2-day MVP with WXT, React, and TypeScript.( It's still in prototype state).

## Features in this Prototype
- Enter Focus Mode → auto-saves tabs with smart note from active tab title
- Manual save with custom note
- Restore last session or any saved one
- View, restore, or delete saved sessions
- Clean popup UI with loading states & basic error handling

## Prerequisites
- Google Chrome (or any Chromium-based browser)
- Node.js 18+ (LTS recommended) + npm (download from https://nodejs.org)
- Git (to clone the repo)

## Step-by-Step: How to Install and Run

### 1. Clone the Repository
Open PowerShell, Command Prompt, or Terminal and run:

```bash
git clone https://github.com/YOUR_USERNAME/deepflow-proto.git
cd deepflow-proto
```
Replace YOUR_USERNAME with your actual GitHub username.

### 2. Install Dependencies
In the project folder run , 
```
npm install
```
### 3.Start the development server

```
npm run dev
```

## 4.Load the extension in crome

1.Open Google Chrome.

2.Go to: ```chrome://extensions/```

3.Turn on Developer mode (toggle in top-right corner).

4.Click Load unpacked.

5.Navigate to your project folder and select the build directory:

Full path example:
```C:\Users\Varsha\DeepFlow-proto\DeepFlow\.output\chrome-mv3-dev```
Select the folder itself (the one containing manifest.json).

6.Click Select Folder / Open.

7.The extension should appear in the list (named "deepflow-proto" or similar).

8.Click the puzzle piece icon in Chrome toolbar → pin DeepFlow (the extension icon).

## 5. How to Use / Test DeepFlow

Open several tabs (code, docs, Slack, YouTube etc).

Click the DeepFlow extension icon in the toolbar.

Enter Focus Mode:\
Click the orange button → it auto-saves your tabs + generates a smart note.
You’ll see "Focus Active 🔥".

Simulate interruption: close tabs, switch windows, do other stuff.

Re-open the popup:
Click Restore Last Session (quick one-click) or
Pick a session from the list → click Restore.

Tabs reopen exactly as saved.

## Tech Stack

WXT (Chrome extension framework, Manifest V3) , 
React + TypeScript , 
Chrome APIs: tabs, storage .
