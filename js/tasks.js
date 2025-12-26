// Momentum - Task Management JavaScript
// Extended task functionality

class TaskManager {
    constructor() {
        this.tasks = [];
        this.loadTasks();
    }
    
    loadTasks() {
        this.tasks = JSON.parse(localStorage.getItem('momentum_tasks') || '[]');
        return this.tasks;
    }
    
    saveTasks() {
        localStorage.setItem('momentum_tasks', JSON.stringify(this.tasks));
    }
    
    addTask(taskData) {
        const task = {
            id: Date.now() + Math.random(),
            title: taskData.title,
            time: taskData.time,
            duration: taskData.duration || 30,
            mustDo: taskData.mustDo || false,
            notes: taskData.notes || '',
            date: taskData.date || new Date().toISOString().split('T')[0],
            completed: false,
            skipped: false,
            skipReason: '',
            createdAt: new Date().toISOString(),
            completedAt: null
        };
        
        this.tasks.push(task);
        this.saveTasks();
        
        // Schedule notification
        this.scheduleTaskNotification(task);
        
        return task;
    }
    
    getTaskById(taskId) {
        return this.tasks.find(task => task.id == taskId);
    }
    
    getTasksByDate(date = null) {
        const targetDate = date || new Date().toISOString().split('T')[0];
        return this.tasks.filter(task => task.date === targetDate);
    }
    
    getTasksByStatus(status) {
        switch(status) {
            case 'pending':
                return this.tasks.filter(task => !task.completed && !task.skipped);
            case 'completed':
                return this.tasks.filter(task => task.completed);
            case 'skipped':
                return this.tasks.filter(task => task.skipped);
            case 'must-do':
                return this.tasks.filter(task => task.mustDo);
            default:
                return this.tasks;
        }
    }
    
    completeTask(taskId) {
        const task = this.getTaskById(taskId);
        if (task) {
            task.completed = true;
            task.completedAt = new Date().toISOString();
            this.saveTasks();
            
            // Clear any scheduled notifications
            this.clearTaskNotification(taskId);
            
            return true;
        }
        return false;
    }
    
    skipTask(taskId, reason) {
        const task = this.getTaskById(taskId);
        if (task) {
            task.skipped = true;
            task.skipReason = reason;
            this.saveTasks();
            
            // Clear any scheduled notifications
            this.clearTaskNotification(taskId);
            
            // Add to skip bank
            this.addToSkipBank(task, reason);
            
            return true;
        }
        return false;
    }
    
    deleteTask(taskId) {
        const index = this.tasks.findIndex(task => task.id == taskId);
        if (index !== -1) {
            this.tasks.splice(index, 1);
            this.saveTasks();
            
            // Clear notification
            this.clearTaskNotification(taskId);
            
            return true;
        }
        return false;
    }
    
    updateTask(taskId, updates) {
        const task = this.getTaskById(taskId);
        if (task) {
            Object.assign(task, updates);
            this.saveTasks();
            
            // Reschedule notification if time changed
            if (updates.time || updates.date) {
                this.clearTaskNotification(taskId);
                this.scheduleTaskNotification(task);
            }
            
            return true;
        }
        return false;
    }
    
    scheduleTaskNotification(task) {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }
        
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
            
            // Store timeout ID for cancellation
            task.notificationTimeoutId = setTimeout(() => {
                this.showTaskNotification(task);
            }, timeout);
            
            this.saveTasks();
        }
    }
    
    clearTaskNotification(taskId) {
        const task = this.getTaskById(taskId);
        if (task && task.notificationTimeoutId) {
            clearTimeout(task.notificationTimeoutId);
            delete task.notificationTimeoutId;
            this.saveTasks();
        }
    }
    
    showTaskNotification(task) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(`⏰ ${task.title}`, {
                body: `Starts at ${this.formatTime(task.time)}${task.mustDo ? ' (Must Do)' : ''}`,
                icon: 'icons/icon-192x192.png',
                tag: `task-${task.id}`
            });
            
            notification.onclick = () => {
                window.focus();
                // Navigate to task details
                if (window.location.pathname.includes('tasks.html')) {
                    this.showTaskDetails(task.id);
                } else {
                    window.location.href = `tasks.html?task=${task.id}`;
                }
                notification.close();
            };
        }
    }
    
    addToSkipBank(task, reason) {
        const skipBank = JSON.parse(localStorage.getItem('momentum_skip_bank') || '[]');
        
        skipBank.push({
            taskId: task.id,
            taskTitle: task.title,
            reason: reason,
            date: new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString()
        });
        
        localStorage.setItem('momentum_skip_bank', JSON.stringify(skipBank));
    }
    
    getSkipBank() {
        return JSON.parse(localStorage.getItem('momentum_skip_bank') || '[]');
    }
    
    getSkipStats() {
        const skipBank = this.getSkipBank();
        const stats = {
            total: skipBank.length,
            byReason: {},
            byDay: {},
            recent: skipBank.slice(-10)
        };
        
        skipBank.forEach(skip => {
            // Count by reason
            stats.byReason[skip.reason] = (stats.byReason[skip.reason] || 0) + 1;
            
            // Count by day
            stats.byDay[skip.date] = (stats.byDay[skip.date] || 0) + 1;
        });
        
        return stats;
    }
    
    getProductivityStats(startDate = null, endDate = null) {
        const now = new Date();
        const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        const defaultEnd = now;
        
        startDate = startDate || defaultStart.toISOString().split('T')[0];
        endDate = endDate || defaultEnd.toISOString().split('T')[0];
        
        const relevantTasks = this.tasks.filter(task => {
            const taskDate = new Date(task.date);
            const start = new Date(startDate);
            const end = new Date(endDate);
            return taskDate >= start && taskDate <= end;
        });
        
        const stats = {
            totalTasks: relevantTasks.length,
            completed: relevantTasks.filter(t => t.completed).length,
            skipped: relevantTasks.filter(t => t.skipped).length,
            pending: relevantTasks.filter(t => !t.completed && !t.skipped).length,
            completionRate: relevantTasks.length > 0 ? 
                (relevantTasks.filter(t => t.completed).length / relevantTasks.length) * 100 : 0,
            averageCompletionTime: this.calculateAverageCompletionTime(relevantTasks),
            busiestDay: this.findBusiestDay(relevantTasks),
            mostProductiveHour: this.findMostProductiveHour(relevantTasks)
        };
        
        return stats;
    }
    
    calculateAverageCompletionTime(tasks) {
        const completedTasks = tasks.filter(t => t.completed && t.completedAt && t.createdAt);
        
        if (completedTasks.length === 0) return null;
        
        const totalTime = completedTasks.reduce((sum, task) => {
            const created = new Date(task.createdAt);
            const completed = new Date(task.completedAt);
            return sum + (completed - created);
        }, 0);
        
        return totalTime / completedTasks.length;
    }
    
    findBusiestDay(tasks) {
        const dayCounts = {};
        
        tasks.forEach(task => {
            dayCounts[task.date] = (dayCounts[task.date] || 0) + 1;
        });
        
        let busiestDay = null;
        let maxCount = 0;
        
        for (const [date, count] of Object.entries(dayCounts)) {
            if (count > maxCount) {
                maxCount = count;
                busiestDay = date;
            }
        }
        
        return busiestDay ? { date: busiestDay, count: maxCount } : null;
    }
    
    findMostProductiveHour(tasks) {
        const hourCounts = new Array(24).fill(0);
        
        tasks.forEach(task => {
            if (task.completed && task.completedAt) {
                const hour = new Date(task.completedAt).getHours();
                hourCounts[hour]++;
            }
        });
        
        const maxCount = Math.max(...hourCounts);
        const mostProductiveHour = hourCounts.indexOf(maxCount);
        
        return {
            hour: mostProductiveHour,
            count: maxCount,
            formattedHour: `${mostProductiveHour}:00`
        };
    }
    
    generateTaskInsights() {
        const stats = this.getProductivityStats();
        const skipStats = this.getSkipStats();
        
        const insights = [];
        
        // Completion rate insight
        if (stats.completionRate >= 80) {
            insights.push("You're completing most of your tasks. Great work!");
        } else if (stats.completionRate >= 50) {
            insights.push("You're completing about half of your tasks. Consider adjusting your workload.");
        } else {
            insights.push("Try breaking tasks into smaller, more manageable pieces.");
        }
        
        // Skip reason insight
        if (skipStats.total > 0) {
            const mostCommonReason = Object.entries(skipStats.byReason)
                .sort(([,a], [,b]) => b - a)[0];
            
            if (mostCommonReason) {
                insights.push(`You often skip tasks because: "${mostCommonReason[0]}". Consider addressing this pattern.`);
            }
        }
        
        // Time management insight
        if (stats.averageCompletionTime) {
            const avgMinutes = Math.round(stats.averageCompletionTime / 60000);
            insights.push(`Tasks take you about ${avgMinutes} minutes on average to complete.`);
        }
        
        // Most productive time insight
        if (stats.mostProductiveHour) {
            const hour = stats.mostProductiveHour.hour;
            const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
            insights.push(`You're most productive in the ${period}. Schedule important tasks then.`);
        }
        
        return insights;
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
    
    showTaskDetails(taskId) {
        // This would show a modal with task details
        // Implementation depends on your UI framework
        console.log(`Showing details for task ${taskId}`);
    }
}

// Initialize task manager
const taskManager = new TaskManager();

// Export for use in other files
window.taskManager = taskManager;

// Task-related UI functions
function renderTaskList(tasks, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg viewBox="0 0 24 24">
                        <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
                    </svg>
                </div>
                <h3>No tasks found</h3>
                <p>Add some tasks to get started</p>
            </div>
        `;
        return;
    }
    
    const html = tasks.map((task, index) => `
        <div class="task-card ${task.mustDo ? 'must-do-card' : ''} ${task.completed ? 'completed' : ''} ${task.skipped ? 'skipped' : ''} stagger-item" 
             data-task-id="${task.id}"
             style="animation-delay: ${index * 0.1}s">
            <div class="task-card-header">
                <h3 class="task-card-title">${task.title}</h3>
                <span class="task-card-time">${taskManager.formatTime(task.time)}</span>
            </div>
            <div class="task-card-body">
                <p class="task-card-notes">${task.notes || 'No additional notes'}</p>
                <div class="task-card-tags">
                    ${task.mustDo ? '<span class="task-tag must-do-tag">Must Do</span>' : ''}
                    ${task.completed ? '<span class="task-tag completed-tag">Completed</span>' : ''}
                    ${task.skipped ? '<span class="task-tag skipped-tag">Skipped</span>' : ''}
                    ${task.skipReason ? `<span class="task-tag reason-tag">${task.skipReason}</span>` : ''}
                </div>
            </div>
            <div class="task-card-actions">
                ${!task.completed && !task.skipped ? `
                    <button class="task-card-btn complete-btn" onclick="completeTaskUI('${task.id}')">
                        <svg viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                    </button>
                    <button class="task-card-btn skip-btn" onclick="showSkipDialog('${task.id}')">
                        <svg viewBox="0 0 24 24">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                ` : ''}
                <button class="task-card-btn detail-btn" onclick="showTaskDetail('${task.id}')">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

function completeTaskUI(taskId) {
    if (taskManager.completeTask(taskId)) {
        // Show animation
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
            taskElement.classList.add('task-complete-animation');
            
            // Update UI
            setTimeout(() => {
                const todayTasks = taskManager.getTasksByDate();
                renderTaskList(todayTasks, 'tasks-container');
                updateStatsUI();
            }, 500);
            
            // Show notification
            showNotification('Task completed! 🎉', 'success');
        }
    }
}

function showSkipDialog(taskId) {
    const task = taskManager.getTaskById(taskId);
    if (!task) return;
    
    // Store current task ID
    window.currentSkipTaskId = taskId;
    
    // Show skip modal
    const modal = document.getElementById('skip-modal');
    if (modal) {
        modal.style.display = 'block';
        
        // Set task title in modal
        const titleElement = modal.querySelector('.modal-header h3');
        if (titleElement) {
            titleElement.textContent = `Skip: ${task.title}`;
        }
    }
}

function submitSkipTask() {
    const taskId = window.currentSkipTaskId;
    if (!taskId) return;
    
    const reasonSelect = document.querySelector('input[name="skip-reason"]:checked');
    const customReason = document.getElementById('custom-reason').value;
    
    const reason = customReason || (reasonSelect ? reasonSelect.value : 'No reason provided');
    
    if (taskManager.skipTask(taskId, reason)) {
        // Update UI
        const todayTasks = taskManager.getTasksByDate();
        renderTaskList(todayTasks, 'tasks-container');
        updateStatsUI();
        
        // Close modal
        const modal = document.getElementById('skip-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.querySelector('form').reset();
        }
        
        // Show notification
        showNotification('Task skipped', 'warning');
    }
}

function showTaskDetail(taskId) {
    const task = taskManager.getTaskById(taskId);
    if (!task) return;
    
    const modal = document.getElementById('task-detail-modal');
    if (modal) {
        // Populate modal with task details
        modal.querySelector('#detail-task-title').textContent = task.title;
        modal.querySelector('#detail-task-time').textContent = taskManager.formatTime(task.time);
        modal.querySelector('#detail-task-status').textContent = 
            task.completed ? 'Completed' : task.skipped ? 'Skipped' : 'Pending';
        modal.querySelector('#detail-task-priority').textContent = task.mustDo ? 'High (Must Do)' : 'Normal';
        modal.querySelector('#detail-task-notes').textContent = task.notes || 'No additional notes';
        
        // Update button states
        const completeBtn = modal.querySelector('#mark-complete-btn');
        const skipBtn = modal.querySelector('#skip-task-btn');
        
        if (task.completed || task.skipped) {
            completeBtn.style.display = 'none';
            skipBtn.style.display = 'none';
        } else {
            completeBtn.style.display = 'block';
            skipBtn.style.display = 'block';
            
            completeBtn.onclick = () => {
                completeTaskUI(taskId);
                modal.style.display = 'none';
            };
            
            skipBtn.onclick = () => {
                window.currentSkipTaskId = taskId;
                modal.style.display = 'none';
                showSkipDialog(taskId);
            };
        }
        
        modal.style.display = 'block';
    }
}

function updateStatsUI() {
    const stats = taskManager.getProductivityStats();
    const skipStats = taskManager.getSkipStats();
    
    // Update counters if elements exist
    const completedElement = document.getElementById('completed-count');
    const totalElement = document.getElementById('total-tasks');
    
    if (completedElement && totalElement) {
        const todayTasks = taskManager.getTasksByDate();
        completedElement.textContent = todayTasks.filter(t => t.completed).length;
        totalElement.textContent = todayTasks.length;
    }
    
    // Update progress bars
    const progressBars = document.querySelectorAll('.progress-fill');
    if (progressBars.length >= 3) {
        const completionRate = stats.totalTasks > 0 ? 
            (stats.completed / stats.totalTasks) * 100 : 0;
        
        progressBars[0].style.width = `${completionRate}%`; // Productivity
        progressBars[1].style.width = `${(stats.completed + stats.skipped) / stats.totalTasks * 100}%`; // Completion
        progressBars[2].style.width = `${Math.min(completionRate * 1.2, 100)}%`; // Consistency
    }
}

// Initialize task list on page load
document.addEventListener('DOMContentLoaded', function() {
    // Load today's tasks on dashboard
    if (document.getElementById('tasks-container')) {
        const todayTasks = taskManager.getTasksByDate();
        renderTaskList(todayTasks, 'tasks-container');
        updateStatsUI();
    }
    
    // Load all tasks on tasks page
    if (document.getElementById('tasks-list')) {
        const allTasks = taskManager.getTasksByStatus('all');
        renderTaskList(allTasks, 'tasks-list');
    }
    
    // Set up skip form submission
    const skipForm = document.getElementById('skip-form');
    if (skipForm) {
        skipForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitSkipTask();
        });
    }
    
    // Set up filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;
            const tasks = taskManager.getTasksByStatus(filter);
            renderTaskList(tasks, 'tasks-list');
            
            // Update active button
            document.querySelectorAll('.filter-btn').forEach(b => 
                b.classList.remove('active')
            );
            this.classList.add('active');
        });
    });
});

// Helper function for notifications
function showNotification(message, type = 'info') {
    // This would be implemented based on your notification system
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// Export functions for global use
window.completeTaskUI = completeTaskUI;
window.showSkipDialog = showSkipDialog;
window.submitSkipTask = submitSkipTask;
window.showTaskDetail = showTaskDetail;
