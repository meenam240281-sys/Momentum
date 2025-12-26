// Momentum - Main Application JavaScript
// Core functionality and app initialization

// DOM Elements
let currentTaskId = null;
let deferredPrompt = null;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    updateDateTime();
    loadMotivationalQuote();
    checkForAlarm();
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    // Check for PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallPrompt();
    });
});

// Initialize app components
function initializeApp() {
    console.log('Momentum app initialized');
    
    // Load user data
    loadUserData();
    
    // Check if it's a new day
    checkNewDay();
    
    // Start task notifications
    startTaskNotifications();
}

// Setup event listeners
function setupEventListeners() {
    // Modal handling
    setupModals();
    
    // Task actions
    setupTaskActions();
    
    // Form submissions
    setupForms();
    
    // Navigation
    setupNavigation();
    
    // Time updates
    setInterval(updateDateTime, 60000); // Update every minute
    
    // Install prompt
    setupInstallPrompt();
}

// Update date and time display
function updateDateTime() {
    const now = new Date();
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit' };
    
    document.getElementById('current-date')?.textContent = now.toLocaleDateString('en-US', dateOptions);
    document.getElementById('current-time')?.textContent = now.toLocaleTimeString('en-US', timeOptions);
}

// Load motivational quote
async function loadMotivationalQuote() {
    const quotes = [
        {
            text: "The secret of getting ahead is getting started.",
            author: "Mark Twain"
        },
        {
            text: "Don't watch the clock; do what it does. Keep going.",
            author: "Sam Levenson"
        },
        {
            text: "The way to get started is to quit talking and begin doing.",
            author: "Walt Disney"
        },
        {
            text: "It's not that I'm so smart, it's just that I stay with problems longer.",
            author: "Albert Einstein"
        },
        {
            text: "The future depends on what you do today.",
            author: "Mahatma Gandhi"
        },
        {
            text: "You are never too old to set another goal or to dream a new dream.",
            author: "C.S. Lewis"
        },
        {
            text: "Believe you can and you're halfway there.",
            author: "Theodore Roosevelt"
        },
        {
            text: "The only way to do great work is to love what you do.",
            author: "Steve Jobs"
        }
    ];
    
    // Try to load from local storage first
    const savedQuote = localStorage.getItem('momentum_current_quote');
    if (savedQuote) {
        const { text, author, date } = JSON.parse(savedQuote);
        const today = new Date().toDateString();
        
        if (date === today) {
            displayQuote(text, author);
            return;
        }
    }
    
    // Get random quote
    const randomIndex = Math.floor(Math.random() * quotes.length);
    const quote = quotes[randomIndex];
    
    // Save for today
    const today = new Date().toDateString();
    localStorage.setItem('momentum_current_quote', JSON.stringify({
        text: quote.text,
        author: quote.author,
        date: today
    }));
    
    displayQuote(quote.text, quote.author);
}

function displayQuote(text, author) {
    const quoteElement = document.getElementById('motivational-quote');
    const authorElement = document.querySelector('.quote-content small');
    
    if (quoteElement) quoteElement.textContent = `"${text}"`;
    if (authorElement) authorElement.textContent = `- ${author}`;
}

// Refresh quote button
document.getElementById('refresh-quote')?.addEventListener('click', function() {
    // Clear saved quote to force new one
    localStorage.removeItem('momentum_current_quote');
    loadMotivationalQuote();
    
    // Add animation
    this.classList.add('pulse-once');
    setTimeout(() => this.classList.remove('pulse-once'), 500);
});

// Modal handling
function setupModals() {
    // Close modals when clicking X or outside
    document.querySelectorAll('.close-modal, .modal').forEach(element => {
        if (element.classList.contains('modal')) {
            element.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.style.display = 'none';
                }
            });
        } else {
            element.addEventListener('click', function() {
                this.closest('.modal').style.display = 'none';
            });
        }
    });
    
    // Task modal
    const taskModal = document.getElementById('task-modal');
    const addTaskBtn = document.getElementById('add-task-btn');
    
    if (addTaskBtn && taskModal) {
        addTaskBtn.addEventListener('click', () => {
            taskModal.style.display = 'block';
            document.getElementById('task-title').focus();
        });
    }
    
    // Skip modal
    const skipModal = document.getElementById('skip-modal');
    
    if (skipModal) {
        document.querySelectorAll('.skip-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                currentTaskId = this.dataset.task;
                skipModal.style.display = 'block';
            });
        });
    }
}

// Task actions
function setupTaskActions() {
    // Task completion
    document.querySelectorAll('.task-check').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                completeTask(this.id.replace('task-', ''));
            }
        });
    });
    
    // Skip task form
    const skipForm = document.getElementById('skip-form');
    if (skipForm) {
        skipForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const selectedReason = document.querySelector('input[name="skip-reason"]:checked');
            const customReason = document.getElementById('custom-reason').value;
            
            const reason = customReason || selectedReason?.value || 'No reason provided';
            
            if (currentTaskId) {
                skipTask(currentTaskId, reason);
            }
            
            document.getElementById('skip-modal').style.display = 'none';
            this.reset();
        });
    }
}

// Form handling
function setupForms() {
    // Task form
    const taskForm = document.getElementById('task-form');
    if (taskForm) {
        taskForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const taskData = {
                id: Date.now(),
                title: document.getElementById('task-title').value,
                time: document.getElementById('task-time').value,
                duration: parseInt(document.getElementById('task-duration').value),
                mustDo: document.getElementById('task-must-do').checked,
                notes: document.getElementById('task-notes').value,
                date: new Date().toISOString().split('T')[0],
                completed: false,
                skipped: false,
                skipReason: ''
            };
            
            addTask(taskData);
            
            // Reset form and close modal
            this.reset();
            document.getElementById('task-modal').style.display = 'none';
            
            // Show success notification
            showNotification('Task added successfully!', 'success');
        });
    }
}

// Navigation
function setupNavigation() {
    // Smooth transitions between pages
    document.querySelectorAll('a').forEach(link => {
        if (link.href && link.href.includes('.html') && !link.href.includes('#')) {
            link.addEventListener('click', function(e) {
                if (!this.target || this.target === '_self') {
                    e.preventDefault();
                    const href = this.getAttribute('href');
                    
                    // Add page transition class
                    document.body.classList.add('page-transition-exit');
                    
                    setTimeout(() => {
                        window.location.href = href;
                    }, 300);
                }
            });
        }
    });
}

// Task management functions
function addTask(task) {
    const tasks = JSON.parse(localStorage.getItem('momentum_tasks') || '[]');
    tasks.push(task);
    localStorage.setItem('momentum_tasks', JSON.stringify(tasks));
    
    // Update UI
    updateTaskList();
    updateStats();
}

function completeTask(taskId) {
    const tasks = JSON.parse(localStorage.getItem('momentum_tasks') || '[]');
    const taskIndex = tasks.findIndex(t => t.id == taskId);
    
    if (taskIndex !== -1) {
        tasks[taskIndex].completed = true;
        tasks[taskIndex].completedAt = new Date().toISOString();
        localStorage.setItem('momentum_tasks', JSON.stringify(tasks));
        
        // Update streak
        updateStreak(true);
        
        // Show celebration
        showTaskCompleteAnimation(taskId);
        
        // Show notification
        showNotification('Task completed! 🎉', 'success');
    }
    
    updateTaskList();
    updateStats();
}

function skipTask(taskId, reason) {
    const tasks = JSON.parse(localStorage.getItem('momentum_tasks') || '[]');
    const taskIndex = tasks.findIndex(t => t.id == taskId);
    
    if (taskIndex !== -1) {
        tasks[taskIndex].skipped = true;
        tasks[taskIndex].skipReason = reason;
        localStorage.setItem('momentum_tasks', JSON.stringify(tasks));
        
        // Add to skip bank
        const skipBank = JSON.parse(localStorage.getItem('momentum_skip_bank') || '[]');
        skipBank.push({
            taskId: taskId,
            taskTitle: tasks[taskIndex].title,
            reason: reason,
            date: new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('momentum_skip_bank', JSON.stringify(skipBank));
        
        // Show notification
        showNotification('Task skipped', 'warning');
    }
    
    updateTaskList();
    updateStats();
}

function updateTaskList() {
    const tasksContainer = document.getElementById('tasks-container');
    if (!tasksContainer) return;
    
    const tasks = JSON.parse(localStorage.getItem('momentum_tasks') || '[]');
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter(task => task.date === today);
    
    // Sort tasks by time
    todayTasks.sort((a, b) => {
        const timeA = a.time.replace(':', '');
        const timeB = b.time.replace(':', '');
        return timeA - timeB;
    });
    
    // Update completed count
    const completedCount = todayTasks.filter(t => t.completed).length;
    const totalCount = todayTasks.length;
    
    document.getElementById('completed-count').textContent = completedCount;
    document.getElementById('total-tasks').textContent = totalCount;
    
    // Update task list
    tasksContainer.innerHTML = todayTasks.map((task, index) => `
        <div class="task-item ${task.mustDo ? 'must-do' : ''} ${task.completed ? 'completed' : ''} ${task.skipped ? 'skipped' : ''} stagger-item" style="animation-delay: ${index * 0.1}s">
            <div class="task-checkbox">
                <input type="checkbox" id="task-${task.id}" class="task-check" ${task.completed ? 'checked' : ''} ${task.skipped ? 'disabled' : ''}>
                <label for="task-${task.id}"></label>
            </div>
            <div class="task-content">
                <h3 class="task-title">${task.title}</h3>
                <p class="task-time">${formatTime(task.time)}</p>
                ${task.mustDo ? '<span class="task-badge must-do-badge">Must Do</span>' : ''}
                ${task.completed ? '<span class="task-badge" style="background: var(--secondary-light); color: var(--secondary-dark);">Completed</span>' : ''}
                ${task.skipped ? '<span class="task-badge" style="background: var(--gray-200); color: var(--gray-600);">Skipped</span>' : ''}
            </div>
            <div class="task-actions">
                ${!task.completed && !task.skipped ? `
                    <button class="task-action-btn skip-btn" data-task="${task.id}">
                        <svg viewBox="0 0 24 24">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
    
    // Re-attach event listeners
    document.querySelectorAll('.skip-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            currentTaskId = this.dataset.task;
            document.getElementById('skip-modal').style.display = 'block';
        });
    });
    
    document.querySelectorAll('.task-check').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                completeTask(this.id.replace('task-', ''));
            }
        });
    });
}

function updateStats() {
    const tasks = JSON.parse(localStorage.getItem('momentum_tasks') || '[]');
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter(task => task.date === today);
    
    const completed = todayTasks.filter(t => t.completed).length;
    const pending = todayTasks.filter(t => !t.completed && !t.skipped).length;
    const skipped = todayTasks.filter(t => t.skipped).length;
    
    // Update progress bars
    const total = todayTasks.length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    
    document.querySelectorAll('.progress-fill').forEach((fill, index) => {
        let width = 0;
        switch(index) {
            case 0: width = completionRate; break; // Productivity
            case 1: width = total > 0 ? ((completed + skipped) / total) * 100 : 0; break; // Completion
            case 2: width = Math.min((parseInt(localStorage.getItem('momentum_streak') || '0') / 7) * 100, 100); break; // Consistency
        }
        fill.style.width = `${width}%`;
        fill.nextElementSibling.textContent = `${Math.round(width)}%`;
    });
}

function updateStreak(taskCompleted) {
    const lastActivity = localStorage.getItem('momentum_last_activity');
    const today = new Date().toISOString().split('T')[0];
    let streak = parseInt(localStorage.getItem('momentum_streak') || '0');
    
    if (!lastActivity) {
        // First time user
        streak = taskCompleted ? 1 : 0;
    } else if (lastActivity === today) {
        // Already active today, maintain streak
        streak = Math.max(streak, 1);
    } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (lastActivity === yesterdayStr) {
            // Consecutive day
            streak += taskCompleted ? 1 : 0;
        } else {
            // Broken streak
            streak = taskCompleted ? 1 : 0;
        }
    }
    
    localStorage.setItem('momentum_streak', streak.toString());
    localStorage.setItem('momentum_last_activity', today);
    
    // Update UI
    const streakElement = document.getElementById('current-streak');
    if (streakElement) streakElement.textContent = streak;
    
    // Celebrate milestones
    if (streak % 7 === 0 && streak > 0) {
        celebrateStreak(streak);
    }
}

function checkNewDay() {
    const lastActivity = localStorage.getItem('momentum_last_activity');
    const today = new Date().toISOString().split('T')[0];
    
    if (lastActivity !== today) {
        // New day, carry over incomplete tasks
        carryOverTasks();
        
        // Update last activity
        localStorage.setItem('momentum_last_activity', today);
    }
}

function carryOverTasks() {
    const tasks = JSON.parse(localStorage.getItem('momentum_tasks') || '[]');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    
    const incompleteTasks = tasks.filter(task => 
        task.date === yesterdayStr && !task.completed && !task.skipped
    );
    
    incompleteTasks.forEach(task => {
        task.date = today;
        // Shift time to current day
        const [hours, minutes] = task.time.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes);
        task.time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    });
    
    localStorage.setItem('momentum_tasks', JSON.stringify(tasks));
    
    if (incompleteTasks.length > 0) {
        showNotification(`${incompleteTasks.length} tasks carried over from yesterday`, 'info');
    }
}

// Alarm functions
function checkForAlarm() {
    const settings = JSON.parse(localStorage.getItem('momentum_settings') || '{}');
    const wakeupTime = settings.wakeupTime || '07:00';
    
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    if (currentTime === wakeupTime) {
        showAlarm();
    }
    
    // Check every minute
    setInterval(() => {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        if (currentTime === wakeupTime) {
            showAlarm();
        }
    }, 60000);
}

function showAlarm() {
    const alarmModal = document.getElementById('alarm-modal');
    if (!alarmModal) return;
    
    const settings = JSON.parse(localStorage.getItem('momentum_settings') || '{}');
    const alarmMessage = settings.alarmMessage || 'Time to start your day with purpose!';
    
    document.getElementById('alarm-message').textContent = alarmMessage;
    
    // Update time display
    const now = new Date();
    const alarmTimeElement = document.querySelector('.alarm-time');
    if (alarmTimeElement) {
        alarmTimeElement.textContent = now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
    }
    
    // Show modal
    alarmModal.style.display = 'block';
    
    // Play sound if enabled
    if (settings.alarmSound !== 'none') {
        playAlarmSound();
    }
    
    // Vibrate if enabled
    if (settings.vibration && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]);
    }
    
    // Show notification
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Good Morning! 🌅', {
            body: alarmMessage,
            icon: 'icons/icon-192x192.png'
        });
    }
}

function playAlarmSound() {
    // This would play an alarm sound
    // For now, we'll use a simple beep
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 1);
}

// Alarm action buttons
document.getElementById('snooze-alarm')?.addEventListener('click', function() {
    const alarmModal = document.getElementById('alarm-modal');
    if (alarmModal) alarmModal.style.display = 'none';
    
    // Snooze for 5 minutes
    setTimeout(() => {
        showAlarm();
    }, 5 * 60 * 1000);
    
    showNotification('Alarm snoozed for 5 minutes', 'info');
});

document.getElementById('dismiss-alarm')?.addEventListener('click', function() {
    const alarmModal = document.getElementById('alarm-modal');
    if (alarmModal) alarmModal.style.display = 'none';
    
    showNotification('Have a productive day!', 'success');
});

// Task notifications
function startTaskNotifications() {
    setInterval(() => {
        checkTaskNotifications();
    }, 60000); // Check every minute
}

function checkTaskNotifications() {
    const tasks = JSON.parse(localStorage.getItem('momentum_tasks') || '[]');
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const settings = JSON.parse(localStorage.getItem('momentum_settings') || '{}');
    const notificationOffset = parseInt(settings.notificationTime) || 5;
    
    const upcomingTasks = tasks.filter(task => {
        if (task.date !== today || task.completed || task.skipped) return false;
        
        const taskTime = new Date();
        const [hours, minutes] = task.time.split(':').map(Number);
        taskTime.setHours(hours, minutes, 0, 0);
        
        const notificationTime = new Date(taskTime.getTime() - notificationOffset * 60000);
        const notificationTimeStr = `${String(notificationTime.getHours()).padStart(2, '0')}:${String(notificationTime.getMinutes()).padStart(2, '0')}`;
        
        return notificationTimeStr === currentTime;
    });
    
    upcomingTasks.forEach(task => {
        showTaskNotification(task);
    });
}

function showTaskNotification(task) {
    // Show browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`⏰ ${task.title}`, {
            body: `Starts at ${formatTime(task.time)}${task.mustDo ? ' (Must Do)' : ''}`,
            icon: 'icons/icon-192x192.png'
        });
    }
    
    // Show in-app notification
    showNotification(`${task.title} starts in a few minutes`, 'info');
}

// Notification system
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <p>${message}</p>
        </div>
    `;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Remove after delay
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Task complete animation
function showTaskCompleteAnimation(taskId) {
    const taskElement = document.querySelector(`#task-${taskId}`)?.closest('.task-item');
    if (taskElement) {
        taskElement.classList.add('task-complete-animation');
        
        // Add confetti effect
        createConfetti(taskElement);
        
        setTimeout(() => {
            taskElement.classList.remove('task-complete-animation');
        }, 500);
    }
}

function createConfetti(element) {
    const rect = element.getBoundingClientRect();
    const colors = ['#667eea', '#4fd1c5', '#ed64a6', '#9f7aea', '#38b2ac'];
    
    for (let i = 0; i < 20; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.cssText = `
            position: fixed;
            width: 8px;
            height: 8px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            border-radius: 2px;
            top: ${rect.top + rect.height / 2}px;
            left: ${rect.left + rect.width / 2}px;
            z-index: 1000;
            pointer-events: none;
        `;
        
        document.body.appendChild(confetti);
        
        // Animate
        const angle = Math.random() * Math.PI * 2;
        const velocity = 2 + Math.random() * 2;
        const tx = Math.cos(angle) * velocity * 100;
        const ty = Math.sin(angle) * velocity * 100;
        
        confetti.animate([
            {
                transform: 'translate(0, 0) rotate(0deg)',
                opacity: 1
            },
            {
                transform: `translate(${tx}px, ${ty}px) rotate(360deg)`,
                opacity: 0
            }
        ], {
            duration: 1000,
            easing: 'cubic-bezier(0.215, 0.610, 0.355, 1)'
        }).onfinish = () => {
            if (confetti.parentNode) {
                confetti.parentNode.removeChild(confetti);
            }
        };
    }
}

// Streak celebration
function celebrateStreak(streak) {
    const celebration = document.createElement('div');
    celebration.className = 'streak-celebration';
    celebration.innerHTML = `
        <div class="streak-celebration-content">
            <h2>🎉 ${streak} Day Streak! 🎉</h2>
            <p>Amazing consistency! Keep up the great work!</p>
            <button class="primary-btn" onclick="this.closest('.streak-celebration').remove()">Continue</button>
        </div>
    `;
    
    document.body.appendChild(celebration);
    
    // Add fireworks
    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            createFirework();
        }, i * 100);
    }
}

function createFirework() {
    const firework = document.createElement('div');
    firework.className = 'firework';
    
    const size = 2 + Math.random() * 4;
    const color = `hsl(${Math.random() * 360}, 100%, 60%)`;
    
    firework.style.cssText = `
        position: fixed;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        top: ${Math.random() * 100}vh;
        left: ${Math.random() * 100}vw;
        z-index: 1001;
        pointer-events: none;
        --tx: ${(Math.random() - 0.5) * 200}px;
        --ty: ${(Math.random() - 0.5) * 200}px;
    `;
    
    document.body.appendChild(firework);
    
    firework.animate([
        {
            transform: 'translate(0, 0)',
            opacity: 1
        },
        {
            transform: 'translate(var(--tx), var(--ty))',
            opacity: 0
        }
    ], {
        duration: 1000,
        easing: 'cubic-bezier(0.215, 0.610, 0.355, 1)'
    }).onfinish = () => {
        if (firework.parentNode) {
            firework.parentNode.removeChild(firework);
        }
    };
}

// Install prompt
function setupInstallPrompt() {
    document.getElementById('install-cancel')?.addEventListener('click', hideInstallPrompt);
    document.getElementById('install-confirm')?.addEventListener('click', installApp);
}

function showInstallPrompt() {
    const installPrompt = document.getElementById('install-prompt');
    if (installPrompt) {
        installPrompt.style.display = 'block';
        installPrompt.classList.add('slide-in-up');
    }
}

function hideInstallPrompt() {
    const installPrompt = document.getElementById('install-prompt');
    if (installPrompt) {
        installPrompt.classList.add('slide-in-down');
        setTimeout(() => {
            installPrompt.style.display = 'none';
            installPrompt.classList.remove('slide-in-down');
        }, 300);
    }
}

async function installApp() {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        hideInstallPrompt();
    } else {
        console.log('User dismissed the install prompt');
    }
    
    deferredPrompt = null;
}

// Utility functions
function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });
}

function loadUserData() {
    // Initialize default settings if not exists
    if (!localStorage.getItem('momentum_settings')) {
        const defaultSettings = {
            wakeupTime: '07:00',
            alarmSound: 'chime',
            vibration: true,
            alarmMessage: 'Time to start your day with purpose!',
            mustDoCount: 3,
            notificationTime: '5',
            autoComplete: false,
            themeColor: '#667eea',
            darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
            fontSize: 'medium'
        };
        localStorage.setItem('momentum_settings', JSON.stringify(defaultSettings));
    }
    
    // Initialize other data if not exists
    if (!localStorage.getItem('momentum_tasks')) {
        localStorage.setItem('momentum_tasks', JSON.stringify([]));
    }
    
    if (!localStorage.getItem('momentum_streak')) {
        localStorage.setItem('momentum_streak', '0');
    }
    
    if (!localStorage.getItem('momentum_skip_bank')) {
        localStorage.setItem('momentum_skip_bank', JSON.stringify([]));
    }
    
    if (!localStorage.getItem('momentum_last_activity')) {
        localStorage.setItem('momentum_last_activity', new Date().toISOString().split('T')[0]);
    }
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('js/service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed: ', error);
            });
    });
}

// Offline detection
window.addEventListener('online', () => {
    showNotification('Back online!', 'success');
});

window.addEventListener('offline', () => {
    showNotification('You are offline. Some features may be limited.', 'warning');
});

// Export for global access
window.Momentum = {
    addTask,
    completeTask,
    skipTask,
    updateStreak,
    showNotification,
    loadMotivationalQuote
};

console.log('Momentum app loaded successfully');
