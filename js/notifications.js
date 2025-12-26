// Momentum - Notifications & Alarms JavaScript
// Handles browser notifications, alarms, and reminders

class NotificationManager {
    constructor() {
        this.permission = null;
        this.scheduledAlarms = new Map();
        this.scheduledNotifications = new Map();
        this.initialize();
    }
    
    async initialize() {
        this.permission = await this.requestPermission();
        this.loadScheduledAlarms();
        
        // Check for missed notifications on startup
        this.checkMissedNotifications();
    }
    
    async requestPermission() {
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications');
            return 'unsupported';
        }
        
        if (Notification.permission === 'granted') {
            return 'granted';
        } else if (Notification.permission === 'denied') {
            console.log('Notification permission was denied');
            return 'denied';
        } else {
            const permission = await Notification.requestPermission();
            return permission;
        }
    }
    
    async showNotification(title, options = {}) {
        if (this.permission !== 'granted') {
            console.log('Cannot show notification: permission not granted');
            return null;
        }
        
        const defaultOptions = {
            icon: 'icons/icon-192x192.png',
            badge: 'icons/icon-72x72.png',
            vibrate: [200, 100, 200],
            requireInteraction: false,
            silent: false,
            tag: 'momentum-notification'
        };
        
        const notificationOptions = { ...defaultOptions, ...options };
        
        try {
            const notification = new Notification(title, notificationOptions);
            
            // Handle notification click
            notification.onclick = () => {
                window.focus();
                notification.close();
                
                // Handle specific actions based on tag
                this.handleNotificationClick(notification.tag, notification.data);
            };
            
            // Auto-close after 5 seconds if not requiring interaction
            if (!notificationOptions.requireInteraction) {
                setTimeout(() => {
                    notification.close();
                }, 5000);
            }
            
            return notification;
        } catch (error) {
            console.error('Error showing notification:', error);
            return null;
        }
    }
    
    handleNotificationClick(tag, data) {
        switch(tag) {
            case 'task-reminder':
                if (data && data.taskId) {
                    // Navigate to task details
                    if (window.location.pathname.includes('tasks.html')) {
                        window.showTaskDetail?.(data.taskId);
                    } else {
                        window.location.href = `tasks.html?task=${data.taskId}`;
                    }
                }
                break;
                
            case 'wakeup-alarm':
                // Show alarm modal
                const alarmModal = document.getElementById('alarm-modal');
                if (alarmModal) {
                    alarmModal.style.display = 'block';
                }
                break;
                
            case 'daily-summary':
                // Navigate to summary page
                window.location.href = 'summary.html';
                break;
                
            default:
                // Default action - do nothing
                break;
        }
    }
    
    scheduleTaskNotification(task) {
        if (this.permission !== 'granted') return;
        
        const settings = JSON.parse(localStorage.getItem('momentum_settings') || '{}');
        const notificationOffset = parseInt(settings.notificationTime) || 5;
        
        const taskDate = new Date(task.date);
        const [hours, minutes] = task.time.split(':').map(Number);
        taskDate.setHours(hours, minutes, 0, 0);
        
        const notificationTime = new Date(taskDate.getTime() - notificationOffset * 60000);
        const now = new Date();
        
        // Only schedule if notification time is in the future
        if (notificationTime > now) {
            const timeout = notificationTime.getTime() - now.getTime();
            const notificationId = `task-${task.id}`;
            
            // Cancel existing notification for this task
            this.cancelScheduledNotification(notificationId);
            
            const timeoutId = setTimeout(async () => {
                await this.showTaskReminder(task);
                this.scheduledNotifications.delete(notificationId);
            }, timeout);
            
            this.scheduledNotifications.set(notificationId, timeoutId);
            
            // Store in local storage for persistence
            this.saveScheduledNotification(notificationId, {
                taskId: task.id,
                scheduledTime: notificationTime.toISOString(),
                timeout: timeout
            });
        }
    }
    
    async showTaskReminder(task) {
        const title = `⏰ ${task.title}`;
        const body = `Starts at ${this.formatTime(task.time)}${task.mustDo ? ' (Must Do)' : ''}`;
        
        const notification = await this.showNotification(title, {
            body: body,
            tag: 'task-reminder',
            data: { taskId: task.id },
            requireInteraction: true,
            actions: [
                {
                    action: 'complete',
                    title: 'Mark Complete'
                },
                {
                    action: 'skip',
                    title: 'Skip'
                }
            ]
        });
        
        if (notification) {
            notification.onclick = (event) => {
                event.preventDefault();
                window.focus();
                
                if (window.taskManager) {
                    window.taskManager.showTaskDetails(task.id);
                }
                notification.close();
            };
            
            // Handle action buttons
            notification.addEventListener('notificationclick', (event) => {
                event.preventDefault();
                
                switch(event.action) {
                    case 'complete':
                        if (window.completeTaskUI) {
                            window.completeTaskUI(task.id);
                        }
                        break;
                        
                    case 'skip':
                        if (window.showSkipDialog) {
                            window.showSkipDialog(task.id);
                        }
                        break;
                }
                
                notification.close();
            });
        }
        
        // Also vibrate if enabled
        if ('vibrate' in navigator) {
            const settings = JSON.parse(localStorage.getItem('momentum_settings') || '{}');
            if (settings.vibration) {
                navigator.vibrate([200, 100, 200]);
            }
        }
    }
    
    scheduleDailyAlarm() {
        const settings = JSON.parse(localStorage.getItem('momentum_settings') || '{}');
        const wakeupTime = settings.wakeupTime || '07:00';
        
        const now = new Date();
        const [hours, minutes] = wakeupTime.split(':').map(Number);
        
        // Create alarm time for today
        const alarmTime = new Date();
        alarmTime.setHours(hours, minutes, 0, 0);
        
        // If alarm time has already passed today, schedule for tomorrow
        if (alarmTime <= now) {
            alarmTime.setDate(alarmTime.getDate() + 1);
        }
        
        const timeout = alarmTime.getTime() - now.getTime();
        const alarmId = 'daily-wakeup';
        
        // Cancel existing alarm
        this.cancelScheduledAlarm(alarmId);
        
        const timeoutId = setTimeout(async () => {
            await this.triggerWakeupAlarm();
            
            // Reschedule for next day
            this.scheduleDailyAlarm();
        }, timeout);
        
        this.scheduledAlarms.set(alarmId, timeoutId);
        
        // Store in local storage
        this.saveScheduledAlarm(alarmId, {
            scheduledTime: alarmTime.toISOString(),
            timeout: timeout
        });
        
        console.log(`Daily alarm scheduled for ${alarmTime.toLocaleString()}`);
    }
    
    async triggerWakeupAlarm() {
        const settings = JSON.parse(localStorage.getItem('momentum_settings') || '{}');
        const alarmMessage = settings.alarmMessage || 'Time to start your day with purpose!';
        
        // Show browser notification
        const notification = await this.showNotification('Good Morning! 🌅', {
            body: alarmMessage,
            tag: 'wakeup-alarm',
            requireInteraction: true,
            actions: [
                {
                    action: 'snooze',
                    title: 'Snooze (5 min)'
                },
                {
                    action: 'dismiss',
                    title: 'Start Day'
                }
            ]
        });
        
        if (notification) {
            // Handle action buttons
            notification.addEventListener('notificationclick', (event) => {
                event.preventDefault();
                
                switch(event.action) {
                    case 'snooze':
                        this.snoozeAlarm();
                        break;
                        
                    case 'dismiss':
                        // Do nothing, user dismissed
                        break;
                }
                
                notification.close();
            });
        }
        
        // Play sound if enabled
        if (settings.alarmSound && settings.alarmSound !== 'none') {
            this.playAlarmSound(settings.alarmSound);
        }
        
        // Vibrate if enabled
        if (settings.vibration && 'vibrate' in navigator) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }
        
        // Show in-app alarm modal
        this.showAlarmModal();
    }
    
    showAlarmModal() {
        const alarmModal = document.getElementById('alarm-modal');
        if (!alarmModal) return;
        
        const settings = JSON.parse(localStorage.getItem('momentum_settings') || '{}');
        const alarmMessage = settings.alarmMessage || 'Time to start your day with purpose!';
        
        document.getElementById('alarm-message')?.textContent = alarmMessage;
        
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
        
        // Load today's tasks for preview
        this.loadTodayTasksPreview();
        
        // Show modal with animation
        alarmModal.style.display = 'block';
        alarmModal.classList.add('alarm-ringing');
    }
    
    snoozeAlarm() {
        // Hide current alarm modal
        const alarmModal = document.getElementById('alarm-modal');
        if (alarmModal) {
            alarmModal.style.display = 'none';
            alarmModal.classList.remove('alarm-ringing');
        }
        
        // Schedule snooze alarm in 5 minutes
        const snoozeId = 'snooze-alarm';
        const timeoutId = setTimeout(() => {
            this.triggerWakeupAlarm();
            this.scheduledAlarms.delete(snoozeId);
        }, 5 * 60 * 1000);
        
        this.scheduledAlarms.set(snoozeId, timeoutId);
        
        // Show notification
        this.showNotification('Alarm snoozed', {
            body: 'Will ring again in 5 minutes',
            tag: 'alarm-snooze'
        });
    }
    
    dismissAlarm() {
        // Hide alarm modal
        const alarmModal = document.getElementById('alarm-modal');
        if (alarmModal) {
            alarmModal.style.display = 'none';
            alarmModal.classList.remove('alarm-ringing');
        }
        
        // Cancel any snooze alarms
        this.cancelScheduledAlarm('snooze-alarm');
        
        // Show notification
        this.showNotification('Have a productive day!', {
            body: 'Make today amazing!',
            tag: 'alarm-dismissed'
        });
    }
    
    playAlarmSound(soundType) {
        // Create audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        switch(soundType) {
            case 'chime':
                this.playChimeSound(audioContext);
                break;
                
            case 'birds':
                this.playBirdsSound(audioContext);
                break;
                
            case 'piano':
                this.playPianoSound(audioContext);
                break;
                
            case 'digital':
                this.playDigitalAlarm(audioContext);
                break;
                
            default:
                this.playDefaultAlarm(audioContext);
        }
    }
    
    playChimeSound(audioContext) {
        // Simple chime sound
        const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
        
        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = freq;
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 1);
            }, index * 300);
        });
    }
    
    playBirdsSound(audioContext) {
        // Bird chirping sound
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                // Random bird-like frequency
                const baseFreq = 1000 + Math.random() * 2000;
                oscillator.frequency.setValueAtTime(baseFreq, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, audioContext.currentTime + 0.1);
                oscillator.frequency.exponentialRampToValueAtTime(baseFreq, audioContext.currentTime + 0.2);
                
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
            }, i * 500);
        }
    }
    
    playPianoSound(audioContext) {
        // Simple piano chord
        const frequencies = [261.63, 329.63, 392.00]; // C4, E4, G4
        
        frequencies.forEach(freq => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = freq;
            oscillator.type = 'triangle';
            
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 2);
        });
    }
    
    playDigitalAlarm(audioContext) {
        // Traditional digital alarm sound
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = 800;
                oscillator.type = 'square';
                
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.1);
            }, i * 300);
        }
    }
    
    playDefaultAlarm(audioContext) {
        // Default simple beep
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
    
    scheduleDailySummary() {
        // Schedule daily summary notification for end of day
        const now = new Date();
        const summaryTime = new Date();
        summaryTime.setHours(21, 0, 0, 0); // 9:00 PM
        
        // If time has passed today, schedule for tomorrow
        if (summaryTime <= now) {
            summaryTime.setDate(summaryTime.getDate() + 1);
        }
        
        const timeout = summaryTime.getTime() - now.getTime();
        const summaryId = 'daily-summary';
        
        // Cancel existing summary
        this.cancelScheduledNotification(summaryId);
        
        const timeoutId = setTimeout(async () => {
            await this.showDailySummary();
            
            // Reschedule for next day
            this.scheduleDailySummary();
        }, timeout);
        
        this.scheduledNotifications.set(summaryId, timeoutId);
        
        this.saveScheduledNotification(summaryId, {
            scheduledTime: summaryTime.toISOString(),
            timeout: timeout
        });
    }
    
    async showDailySummary() {
        const stats = window.taskManager?.getProductivityStats() || {};
        
        let summaryText = "Daily Summary:\n";
        
        if (stats.totalTasks > 0) {
            const completionRate = Math.round(stats.completionRate);
            summaryText += `✅ Completed: ${stats.completed}/${stats.totalTasks} (${completionRate}%)\n`;
            
            if (stats.skipped > 0) {
                summaryText += `⏭️ Skipped: ${stats.skipped}\n`;
            }
            
            // Add motivational message based on completion rate
            if (completionRate >= 80) {
                summaryText += "\nAmazing work! You're crushing it! 🚀";
            } else if (completionRate >= 50) {
                summaryText += "\nGood progress! Every step counts. 👣";
            } else {
                summaryText += "\nTomorrow is a new opportunity! 🌟";
            }
        } else {
            summaryText += "No tasks completed today. Add some for tomorrow!";
        }
        
        await this.showNotification('📊 Daily Summary', {
            body: summaryText,
            tag: 'daily-summary',
            requireInteraction: true,
            actions: [
                {
                    action: 'view-summary',
                    title: 'View Details'
                },
                {
                    action: 'plan-tomorrow',
                    title: 'Plan Tomorrow'
                }
            ]
        });
    }
    
    loadTodayTasksPreview() {
        const tasksContainer = document.getElementById('today-tasks-preview');
        if (!tasksContainer) return;
        
        const tasks = window.taskManager?.getTasksByDate() || [];
        const mustDoTasks = tasks.filter(task => task.mustDo && !task.completed);
        
        if (mustDoTasks.length > 0) {
            tasksContainer.innerHTML = mustDoTasks.slice(0, 3).map(task => 
                `<li>${task.title} (${this.formatTime(task.time)})</li>`
            ).join('');
        } else {
            tasksContainer.innerHTML = '<li>No must-do tasks scheduled</li>';
        }
    }
    
    checkMissedNotifications() {
        // Check for notifications that should have fired while app was closed
        const scheduled = JSON.parse(localStorage.getItem('momentum_scheduled_notifications') || '[]');
        const now = new Date();
        
        scheduled.forEach(item => {
            const scheduledTime = new Date(item.scheduledTime);
            
            if (scheduledTime <= now) {
                // This notification was missed
                console.log('Missed notification:', item);
                
                // Remove from storage
                this.removeScheduledNotification(item.id);
                
                // Handle specific missed notifications
                if (item.id.startsWith('task-')) {
                    const taskId = item.id.replace('task-', '');
                    const task = window.taskManager?.getTaskById(taskId);
                    
                    if (task && !task.completed && !task.skipped) {
                        // Show missed task notification
                        this.showMissedTaskNotification(task);
                    }
                }
            }
        });
    }
    
    async showMissedTaskNotification(task) {
        const title = `⏰ Missed: ${task.title}`;
        const body = `Was scheduled for ${this.formatTime(task.time)}`;
        
        await this.showNotification(title, {
            body: body,
            tag: 'missed-task',
            data: { taskId: task.id },
            requireInteraction: true
        });
    }
    
    saveScheduledNotification(id, data) {
        const scheduled = JSON.parse(localStorage.getItem('momentum_scheduled_notifications') || '[]');
        
        // Remove existing entry with same id
        const filtered = scheduled.filter(item => item.id !== id);
        
        // Add new entry
        filtered.push({ id, ...data });
        
        localStorage.setItem('momentum_scheduled_notifications', JSON.stringify(filtered));
    }
    
    removeScheduledNotification(id) {
        const scheduled = JSON.parse(localStorage.getItem('momentum_scheduled_notifications') || '[]');
        const filtered = scheduled.filter(item => item.id !== id);
        localStorage.setItem('momentum_scheduled_notifications', JSON.stringify(filtered));
    }
    
    saveScheduledAlarm(id, data) {
        localStorage.setItem('momentum_scheduled_alarms', JSON.stringify({
            [id]: data
        }));
    }
    
    loadScheduledAlarms() {
        const alarms = JSON.parse(localStorage.getItem('momentum_scheduled_alarms') || '{}');
        
        Object.entries(alarms).forEach(([id, data]) => {
            const scheduledTime = new Date(data.scheduledTime);
            const now = new Date();
            
            if (scheduledTime > now) {
                const timeout = scheduledTime.getTime() - now.getTime();
                
                const timeoutId = setTimeout(() => {
                    if (id === 'daily-wakeup') {
                        this.triggerWakeupAlarm();
                        this.scheduleDailyAlarm();
                    }
                }, timeout);
                
                this.scheduledAlarms.set(id, timeoutId);
            }
        });
    }
    
    cancelScheduledNotification(id) {
        const timeoutId = this.scheduledNotifications.get(id);
        if (timeoutId) {
            clearTimeout(timeoutId);
            this.scheduledNotifications.delete(id);
            this.removeScheduledNotification(id);
        }
    }
    
    cancelScheduledAlarm(id) {
        const timeoutId = this.scheduledAlarms.get(id);
        if (timeoutId) {
            clearTimeout(timeoutId);
            this.scheduledAlarms.delete(id);
        }
    }
    
    cancelAllScheduled() {
        // Cancel all scheduled notifications
        this.scheduledNotifications.forEach((timeoutId, id) => {
            clearTimeout(timeoutId);
            this.removeScheduledNotification(id);
        });
        this.scheduledNotifications.clear();
        
        // Cancel all scheduled alarms
        this.scheduledAlarms.forEach((timeoutId, id) => {
            clearTimeout(timeoutId);
        });
        this.scheduledAlarms.clear();
        
        // Clear from storage
        localStorage.removeItem('momentum_scheduled_notifications');
        localStorage.removeItem('momentum_scheduled_alarms');
    }
    
    formatTime(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes);
        return date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
    }
    
    // Public API
    scheduleTaskReminder(task) {
        this.scheduleTaskNotification(task);
    }
    
    cancelTaskReminder(taskId) {
        this.cancelScheduledNotification(`task-${taskId}`);
    }
    
    setupDailyAlarm() {
        this.scheduleDailyAlarm();
    }
    
    setupDailySummary() {
        this.scheduleDailySummary();
    }
    
    testNotification() {
        this.showNotification('Test Notification', {
            body: 'This is a test notification from Momentum',
            tag: 'test'
        });
    }
    
    testAlarm() {
        this.triggerWakeupAlarm();
    }
}

// Initialize notification manager
const notificationManager = new NotificationManager();

// Set up alarm modal buttons
document.addEventListener('DOMContentLoaded', function() {
    const snoozeBtn = document.getElementById('snooze-alarm');
    const dismissBtn = document.getElementById('dismiss-alarm');
    
    if (snoozeBtn) {
        snoozeBtn.addEventListener('click', () => {
            notificationManager.snoozeAlarm();
        });
    }
    
    if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
            notificationManager.dismissAlarm();
        });
    }
    
    // Start daily alarms and summaries
    setTimeout(() => {
        notificationManager.setupDailyAlarm();
        notificationManager.setupDailySummary();
    }, 1000);
});

// Export for use in other files
window.notificationManager = notificationManager;

// Service Worker messaging for push notifications
if ('serviceWorker' in navigator && 'PushManager' in window) {
    navigator.serviceWorker.ready.then(registration => {
        // You could set up push notifications here
        console.log('Service Worker ready for push notifications');
    });
          }
