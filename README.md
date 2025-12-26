# Momentum - Productivity PWA

Momentum is a mobile-first Progressive Web App that helps you build daily habits, track tasks, and maintain productivity streaks.

## Features

- 📱 **Mobile-First Design**: Optimized for mobile devices with touch-friendly interface
- 🚀 **PWA Features**: Installable, works offline, push notifications
- 📝 **Task Management**: Add, complete, skip tasks with reasons
- 🔥 **Streak Tracking**: Visual streak calendar and progress tracking
- ⏰ **Smart Alarms**: Wake-up alarms with motivational messages
- 📊 **Daily Summary**: Comprehensive productivity insights
- 🎨 **Customizable**: Themes, colors, and settings
- 💾 **Offline Support**: Works without internet connection
- 📈 **Progress Analytics**: Detailed statistics and insights

## Installation

### Option 1: Deploy to GitHub Pages

1. Create a new GitHub repository
2. Upload all files to the repository
3. Go to Repository Settings → Pages
4. Select "main" branch as source
5. Your site will be available at: `https://[username].github.io/[repository-name]`

### Option 2: Deploy to Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow the prompts to deploy

### Option 3: Deploy to Netlify

1. Drag and drop the folder to Netlify
2. Or connect your GitHub repository

## Local Development

1. Clone the repository
2. Open `index.html` in a browser
3. For testing service workers, use a local server:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js with http-server
   npx http-server
