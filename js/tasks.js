// js/tasks.js
class TaskManager {
    constructor() {
        this.tasks = [];
        this.db = firebase.firestore();
        this.userId = null;
        
        this.initialize();
    }
    
    async initialize() {
        // Wait for auth to be ready
        setTimeout(() => {
            this.userId = auth.getUserId();
            this.loadTasks();
        }, 1000);
        
        this.setupTaskForm();
    }
    
    setupTaskForm() {
        const taskForm = document.getElementById('taskForm');
        if (!taskForm) return;
        
        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTaskFromForm();
        });
        
        // Setup task actions
        this.setupTaskActions();
    }
    
    setupTaskActions() {
        // Delegated event listeners for dynamic task lists
        document.addEventListener('click', (e) => {
            // Mark task as done
            if (e.target.closest('.task-done-btn')) {
                const taskId = e.target.closest('[data-task-id]').dataset.taskId;
                this.completeTask(taskId);
            }
            
            // Skip task
            if (e.target.closest('.task-skip-btn')) {
                const taskId = e.target.closest('[data-task-id]').dataset.taskId;
                this.showSkipDialog(taskId);
            }
            
            // Delete task
            if (e.target.closest('.task-delete-btn')) {
                const taskId = e.target.closest('[data-task-id]').dataset.taskId;
                if (confirm('Delete this task?')) {
                    this.deleteTask(taskId);
                }
            }
        });
    }
    
    async loadTasks() {
        const today = new Date().toDateString();
        
        if (auth.isUserGuest()) {
            // Load from localStorage
            const savedTasks = localStorage.getItem(`momentum_tasks_${today}`);
            if (savedTasks) {
                this.tasks = JSON.parse(savedTasks);
            }
        } else {
            // Load from Firestore [citation:2]
            try {
                const snapshot = await this.db
                    .collection('users')
                    .doc(this.userId)
                    .collection('tasks')
                    .where('date', '==', today)
                    .get();
                
                this.tasks = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (error) {
                console.error('Error loading tasks:', error);
                this.tasks = [];
            }
        }
        
        this.renderTasks();
    }
    
    async addTaskFromForm() {
        const form = document.getElementById('taskForm');
        const time = form.querySelector('#taskTime').value;
        const title = form.querySelector('#taskTitle').value;
        const mustDo = form.querySelector('#taskMustDo').checked;
        const challenge = form.querySelector('#taskChallenge').value || '';
        
        if (!title.trim()) {
            alert('Please enter a task title');
            return;
        }
        
        const task = {
            id: 'task_' + Date.now(),
            time: time || 'Anytime',
            title: title.trim(),
            mustDo: mustDo,
            challenge: challenge,
            completed: false,
            skipped: false,
            skipReason: '',
            date: new Date().toDateString(),
            createdAt: new Date().toISOString()
        };
        
        // Check must-do limit
        if (mustDo) {
            const mustDoCount = this.tasks.filter(t => t.mustDo && !t.completed).length;
            if (mustDoCount >= 3) {
                alert('Maximum 3 must-do tasks per day. Complete or remove one first.');
                return;
            }
        }
        
        this.tasks.push(task);
        
        if (auth.isUserGuest()) {
            localStorage.setItem(`momentum_tasks_${task.date}`, JSON.stringify(this.tasks));
        } else {
            try {
                await this.db
                    .collection('users')
                    .doc(this.userId)
                    .collection('tasks')
                    .doc(task.id)
                    .set(task);
            } catch (error) {
                console.error('Error saving task:', error);
            }
        }
        
        this.renderTasks();
        form.reset();
        
        // Update must-do tasks on dashboard
        if (mustDo) {
            app.addTask(task);
        }
    }
    
    async completeTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        task.completed = true;
        task.completedAt = new Date().toISOString();
        
        // Add points to daily score
        const currentScore = parseInt(localStorage.getItem('momentum_dailyScore') || '0');
        const newScore = currentScore + 10; // 10 points per task
        localStorage.setItem('momentum_dailyScore', newScore.toString());
        
        // Update app instance
        if (window.app) {
            window.app.dailyScore = newScore;
            window.app.updateUI();
        }
        
        await this.saveTask(task);
        this.renderTasks();
    }
    
    showSkipDialog(taskId) {
        const reasons = [
            'Not enough time',
            'Not feeling well',
            'Unexpected event',
            'Changed priorities',
            'Task not relevant'
        ];
        
        const reason = prompt(`Skip task?\nReasons: ${reasons.join(', ')}\nEnter your reason:`);
        if (reason !== null) {
            this.skipTask(taskId, reason.trim());
        }
    }
    
    async skipTask(taskId, reason) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        task.skipped = true;
        task.skipReason = reason;
        task.skippedAt = new Date().toISOString();
        
        await this.saveTask(task);
        this.renderTasks();
        
        // Save skipped task for summary
        const skippedTasks = JSON.parse(localStorage.getItem('momentum_skippedTasks') || '[]');
        skippedTasks.push({
            taskId: taskId,
            title: task.title,
            reason: reason,
            date: new Date().toISOString()
        });
        localStorage.setItem('momentum_skippedTasks', JSON.stringify(skippedTasks));
    }
    
    async deleteTask(taskId) {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        
        if (auth.isUserGuest()) {
            const today = new Date().toDateString();
            localStorage.setItem(`momentum_tasks_${today}`, JSON.stringify(this.tasks));
        } else {
            try {
                await this.db
                    .collection('users')
                    .doc(this.userId)
                    .collection('tasks')
                    .doc(taskId)
                    .delete();
            } catch (error) {
                console.error('Error deleting task:', error);
            }
        }
        
        this.renderTasks();
    }
    
    async saveTask(task) {
        if (auth.isUserGuest()) {
            const today = new Date().toDateString();
            localStorage.setItem(`momentum_tasks_${today}`, JSON.stringify(this.tasks));
        } else {
            try {
                await this.db
                    .collection('users')
                    .doc(this.userId)
                    .collection('tasks')
                    .doc(task.id)
                    .set(task, { merge: true });
            } catch (error) {
                console.error('Error saving task:', error);
            }
        }
    }
    
    renderTasks() {
        const taskList = document.getElementById('taskList');
        if (!taskList) return;
        
        if (this.tasks.length === 0) {
            taskList.innerHTML = `
                <div class="empty-state">
                    <p>No tasks yet. Add your first task above!</p>
                </div>
            `;
            return;
        }
        
        // Sort tasks: must-do first, then by time
        const sortedTasks = [...this.tasks].sort((a, b) => {
            if (a.mustDo && !b.mustDo) return -1;
            if (!a.mustDo && b.mustDo) return 1;
            return a.time.localeCompare(b.time);
        });
        
        taskList.innerHTML = sortedTasks.map(task => `
            <div class="task-item" data-task-id="${task.id}">
                <div class="task-checkbox ${task.completed ? 'checked' : ''}" 
                     onclick="taskManager.completeTask('${task.id}')">
                    ${task.completed ? '✓' : ''}
                </div>
                <div class="task-content">
                    <div class="task-header">
                        <h4 class="task-title ${task.completed ? 'completed' : ''}">
                            ${task.title}
                            ${task.mustDo ? '<span class="must-do-badge">Must Do</span>' : ''}
                        </h4>
                        <span class="task-time">${task.time}</span>
                    </div>
                    ${task.challenge ? `<p class="task-challenge">Challenge: ${task.challenge}</p>` : ''}
                    ${task.skipped ? `<p class="task-skipped">Skipped: ${task.skipReason}</p>` : ''}
                    ${task.completed ? `<p class="task-completed">Completed at ${new Date(task.completedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>` : ''}
                </div>
                <div class="task-actions">
                    ${!task.completed && !task.skipped ? `
                        <button class="task-done-btn" title="Mark as done">✅</button>
                        <button class="task-skip-btn" title="Skip task">⏭️</button>
                    ` : ''}
                    <button class="task-delete-btn" title="Delete task">🗑️</button>
                </div>
            </div>
        `).join('');
    }
    
    getTasksSummary() {
        const completed = this.tasks.filter(t => t.completed).length;
        const skipped = this.tasks.filter(t => t.skipped).length;
        const pending = this.tasks.filter(t => !t.completed && !t.skipped).length;
        
        return { completed, skipped, pending, total: this.tasks.length };
    }
}

// Initialize task manager
const taskManager = new TaskManager();
