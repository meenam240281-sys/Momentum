// js/app.js
class MomentumApp {
    constructor() {
        this.currentUser = null;
        this.isGuest = true;
        this.today = new Date().toDateString();
        this.dailyScore = 0;
        this.streak = 0;
        this.mustDoTasks = [];
        
        this.initializeApp();
    }
    
    initializeApp() {
        // Wait for DOM to be fully loaded
        document.addEventListener('DOMContentLoaded', () => {
            this.setupNavigation();
            this.loadUserData();
            this.updateDate();
            this.setupEventListeners();
            this.checkMidnightReset();
            
            // Ensure all UI elements are clickable
            this.fixClickabilityIssues();
        });
    }
    
    setupNavigation() {
        // Update active nav item
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navItems = document.querySelectorAll('.nav-link, .nav-item');
        
        navItems.forEach(item => {
            const page = item.getAttribute('data-page');
            if (currentPage.includes(page) || 
                (currentPage === 'index.html' && page === 'home')) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Handle navigation clicks
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                if (!item.href) return;
                
                // Update active state
                navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                // Add loading state
                item.classList.add('loading');
                setTimeout(() => item.classList.remove('loading'), 300);
            });
        });
    }
    
    loadUserData() {
        const savedDate = localStorage.getItem('momentum_lastDate');
        const savedScore = localStorage.getItem('momentum_dailyScore');
        const savedStreak = localStorage.getItem('momentum_streak');
        
        // Check if it's a new day
        if (savedDate !== this.today) {
            this.dailyScore = 0;
            this.streak = savedDate ? this.calculateStreak(savedDate, parseInt(savedStreak || 0)) : 0;
            localStorage.setItem('momentum_lastDate', this.today);
            localStorage.setItem('momentum_dailyScore', '0');
        } else {
            this.dailyScore = parseInt(savedScore || 0);
            this.streak = parseInt(savedStreak || 0);
        }
        
        this.updateUI();
    }
    
    calculateStreak(lastDate, lastStreak) {
        const last = new Date(lastDate);
        const today = new Date();
        const diffTime = Math.abs(today - last);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            // Consecutive day
            return lastStreak + 1;
        } else if (diffDays > 1) {
            // Broken streak
            return 0;
        }
        return lastStreak;
    }
    
    updateDate() {
        const dateElement = document.getElementById('currentDate');
        if (dateElement) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateElement.textContent = `Today, ${new Date().toLocaleDateString('en-US', options)}`;
        }
    }
    
    updateUI() {
        // Update score display
        const scoreElement = document.getElementById('dailyScore');
        if (scoreElement) {
            scoreElement.textContent = this.dailyScore;
            
            // Update progress bar (assuming max 100 points)
            const progressFill = document.getElementById('progressFill');
            if (progressFill) {
                const progress = Math.min((this.dailyScore / 100) * 100, 100);
                progressFill.style.width = `${progress}%`;
            }
        }
        
        // Update streak display
        const streakElement = document.getElementById('streakCount');
        if (streakElement) {
            streakElement.textContent = `${this.streak} day${this.streak !== 1 ? 's' : ''} streak`;
        }
        
        // Update must-do tasks count
        const mustDoCount = document.getElementById('mustDoCount');
        if (mustDoCount) {
            const completed = this.mustDoTasks.filter(task => task.completed).length;
            mustDoCount.textContent = `${completed}/${this.mustDoTasks.length}`;
        }
    }
    
    setupEventListeners() {
        // Plan Tomorrow button
        const planTomorrowBtn = document.getElementById('planTomorrow');
        if (planTomorrowBtn) {
            planTomorrowBtn.addEventListener('click', () => {
                this.showNotification('Tomorrow planning feature coming soon!');
            });
        }
        
        // Reset Score button
        const resetScoreBtn = document.getElementById('resetScore');
        if (resetScoreBtn) {
            resetScoreBtn.addEventListener('click', () => {
                if (confirm('Reset today\'s score to 0?')) {
                    this.dailyScore = 0;
                    localStorage.setItem('momentum_dailyScore', '0');
                    this.updateUI();
                }
            });
        }
        
        // Personal message auto-save
        const messageInput = document.getElementById('personalMessage');
        if (messageInput) {
            const savedMessage = localStorage.getItem('momentum_personalMessage') || '';
            messageInput.value = savedMessage;
            
            messageInput.addEventListener('input', (e) => {
                localStorage.setItem('momentum_personalMessage', e.target.value);
            });
        }
    }
    
    checkMidnightReset() {
        // Check every minute if date has changed
        setInterval(() => {
            const now = new Date();
            const currentDateString = now.toDateString();
            
            if (currentDateString !== this.today) {
                this.today = currentDateString;
                this.dailyScore = 0;
                localStorage.setItem('momentum_lastDate', this.today);
                localStorage.setItem('momentum_dailyScore', '0');
                this.updateUI();
                this.showNotification('New day! Score reset to 0.');
            }
        }, 60000); // Check every minute
    }
    
    fixClickabilityIssues() {
        // Remove any pointer-events: none from main containers
        const mainContainers = document.querySelectorAll('main, .container, .main-content');
        mainContainers.forEach(container => {
            container.style.pointerEvents = 'auto';
        });
        
        // Ensure buttons are always clickable
        const buttons = document.querySelectorAll('button, a[href]');
        buttons.forEach(button => {
            button.style.pointerEvents = 'auto';
            button.style.cursor = 'pointer';
        });
        
        // Fix z-index hierarchy
        const elements = document.querySelectorAll('*');
        elements.forEach(el => {
            const zIndex = parseInt(window.getComputedStyle(el).zIndex);
            if (zIndex > 1000) {
                el.style.zIndex = '100'; // Cap high z-index values
            }
        });
    }
    
    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 1rem;
            right: 1rem;
            background: var(--primary-color);
            color: white;
            padding: 1rem;
            border-radius: 0.5rem;
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            pointer-events: auto !important;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    // Task management methods
    addTask(task) {
        if (task.mustDo && this.mustDoTasks.length < 3) {
            this.mustDoTasks.push(task);
            this.saveTasks();
            this.updateUI();
        }
    }
    
    completeTask(taskId) {
        const task = this.mustDoTasks.find(t => t.id === taskId);
        if (task) {
            task.completed = true;
            this.dailyScore += 10; // 10 points per completed task
            localStorage.setItem('momentum_dailyScore', this.dailyScore.toString());
            this.saveTasks();
            this.updateUI();
        }
    }
    
    saveTasks() {
        if (this.isGuest) {
            localStorage.setItem('momentum_tasks', JSON.stringify(this.mustDoTasks));
        } else {
            // Save to Firebase for logged-in users
            // Implementation in tasks.js
        }
    }
}

// Initialize the app
const app = new MomentumApp();
