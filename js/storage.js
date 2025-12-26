// Momentum - Storage Management JavaScript
// Handles all local storage operations with data validation and migration

class StorageManager {
    constructor() {
        this.version = '1.0.0';
        this.storageKey = 'momentum_data';
        this.initialize();
    }
    
    initialize() {
        // Check if we need to migrate from old storage format
        this.migrateFromLegacyStorage();
        
        // Initialize default data structure if not exists
        if (!this.getFullData()) {
            this.initializeDefaultData();
        }
        
        // Validate and clean data
        this.validateData();
    }
    
    migrateFromLegacyStorage() {
        const legacyKeys = [
            'momentum_tasks',
            'momentum_settings',
            'momentum_streak',
            'momentum_skip_bank',
            'momentum_last_activity',
            'momentum_current_quote'
        ];
        
        let hasLegacyData = false;
        const legacyData = {};
        
        // Check for legacy data
        legacyKeys.forEach(key => {
            const data = localStorage.getItem(key);
            if (data) {
                hasLegacyData = true;
                legacyData[key.replace('momentum_', '')] = JSON.parse(data);
            }
        });
        
        if (hasLegacyData) {
            console.log('Migrating from legacy storage format...');
            
            // Convert legacy data to new format
            const newData = {
                version: this.version,
                tasks: legacyData.tasks || [],
                settings: legacyData.settings || this.getDefaultSettings(),
                streak: legacyData.streak || 0,
                skipBank: legacyData.skipBank || [],
                lastActivity: legacyData.lastActivity || new Date().toISOString().split('T')[0],
                currentQuote: legacyData.currentQuote || null,
                reflections: [],
                statistics: this.initializeStatistics()
            };
            
            // Save new format
            localStorage.setItem(this.storageKey, JSON.stringify(newData));
            
            // Remove legacy keys
            legacyKeys.forEach(key => {
                localStorage.removeItem(key);
            });
            
            console.log('Migration completed successfully');
        }
    }
    
    initializeDefaultData() {
        const defaultData = {
            version: this.version,
            tasks: [],
            settings: this.getDefaultSettings(),
            streak: 0,
            skipBank: [],
            lastActivity: new Date().toISOString().split('T')[0],
            currentQuote: null,
            reflections: [],
            statistics: this.initializeStatistics()
        };
        
        this.setFullData(defaultData);
    }
    
    getDefaultSettings() {
        return {
            wakeupTime: '07:00',
            alarmSound: 'chime',
            vibration: true,
            alarmMessage: 'Time to start your day with purpose!',
            mustDoCount: 3,
            notificationTime: '5',
            autoComplete: false,
            themeColor: '#667eea',
            darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
            fontSize: 'medium',
            enableNotifications: true,
            enableSounds: true,
            enableVibration: true,
            weekStart: 'monday',
            timeFormat: '12h',
            dateFormat: 'mm/dd/yyyy',
            firstDayOfWeek: 0 // 0 = Sunday, 1 = Monday
        };
    }
    
    initializeStatistics() {
        return {
            totalTasksCreated: 0,
            totalTasksCompleted: 0,
            totalTasksSkipped: 0,
            currentStreak: 0,
            longestStreak: 0,
            averageCompletionRate: 0,
            dailyAverages: {},
            weeklyAverages: {},
            monthlyAverages: {},
            productivityByHour: new Array(24).fill(0),
            productivityByDay: new Array(7).fill(0),
            completionTimes: [],
            skipReasons: {},
            lastUpdated: new Date().toISOString()
        };
    }
    
    validateData() {
        const data = this.getFullData();
        let needsUpdate = false;
        
        // Validate version
        if (!data.version || data.version !== this.version) {
            data.version = this.version;
            needsUpdate = true;
        }
        
        // Validate data structure
        if (!Array.isArray(data.tasks)) {
            data.tasks = [];
            needsUpdate = true;
        }
        
        if (!data.settings || typeof data.settings !== 'object') {
            data.settings = this.getDefaultSettings();
            needsUpdate = true;
        }
        
        if (typeof data.streak !== 'number') {
            data.streak = 0;
            needsUpdate = true;
        }
        
        if (!Array.isArray(data.skipBank)) {
            data.skipBank = [];
            needsUpdate = true;
        }
        
        if (!data.lastActivity || typeof data.lastActivity !== 'string') {
            data.lastActivity = new Date().toISOString().split('T')[0];
            needsUpdate = true;
        }
        
        if (!Array.isArray(data.reflections)) {
            data.reflections = [];
            needsUpdate = true;
        }
        
        if (!data.statistics || typeof data.statistics !== 'object') {
            data.statistics = this.initializeStatistics();
            needsUpdate = true;
        }
        
        // Validate individual tasks
        data.tasks = data.tasks.filter(task => this.validateTask(task));
        
        // Validate skip bank entries
        data.skipBank = data.skipBank.filter(entry => this.validateSkipEntry(entry));
        
        // Validate reflections
        data.reflections = data.reflections.filter(reflection => this.validateReflection(reflection));
        
        if (needsUpdate) {
            this.setFullData(data);
        }
    }
    
    validateTask(task) {
        const requiredFields = ['id', 'title', 'time', 'date'];
        const optionalFields = ['duration', 'mustDo', 'notes', 'completed', 'skipped', 'skipReason', 'createdAt', 'completedAt'];
        
        // Check required fields
        for (const field of requiredFields) {
            if (!task.hasOwnProperty(field)) {
                console.warn(`Task missing required field: ${field}`, task);
                return false;
            }
        }
        
        // Validate field types
        if (typeof task.id !== 'number' && typeof task.id !== 'string') {
            console.warn('Task id must be number or string', task);
            return false;
        }
        
        if (typeof task.title !== 'string' || task.title.trim() === '') {
            console.warn('Task title must be non-empty string', task);
            return false;
        }
        
        // Validate time format (HH:MM)
        if (!/^([0-1][0-9]|2[0-3]):([0-5][0-9])$/.test(task.time)) {
            console.warn('Task time must be in HH:MM format', task);
            return false;
        }
        
        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(task.date)) {
            console.warn('Task date must be in YYYY-MM-DD format', task);
            return false;
        }
        
        // Set default values for optional fields
        if (typeof task.duration !== 'number') task.duration = 30;
        if (typeof task.mustDo !== 'boolean') task.mustDo = false;
        if (typeof task.completed !== 'boolean') task.completed = false;
        if (typeof task.skipped !== 'boolean') task.skipped = false;
        if (typeof task.skipReason !== 'string') task.skipReason = '';
        if (!task.createdAt) task.createdAt = new Date().toISOString();
        
        // Ensure notes is a string
        if (typeof task.notes !== 'string') task.notes = '';
        
        // Validate duration range
        if (task.duration < 1 || task.duration > 1440) {
            task.duration = Math.max(1, Math.min(1440, task.duration));
        }
        
        return true;
    }
    
    validateSkipEntry(entry) {
        const requiredFields = ['taskId', 'taskTitle', 'reason', 'date', 'timestamp'];
        
        for (const field of requiredFields) {
            if (!entry.hasOwnProperty(field)) {
                console.warn(`Skip entry missing required field: ${field}`, entry);
                return false;
            }
        }
        
        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
            console.warn('Skip entry date must be in YYYY-MM-DD format', entry);
            return false;
        }
        
        return true;
    }
    
    validateReflection(reflection) {
        const requiredFields = ['date', 'mood', 'achievements', 'improvements'];
        
        for (const field of requiredFields) {
            if (!reflection.hasOwnProperty(field)) {
                console.warn(`Reflection missing required field: ${field}`, reflection);
                return false;
            }
        }
        
        // Validate mood value (1-5)
        if (typeof reflection.mood !== 'number' || reflection.mood < 1 || reflection.mood > 5) {
            console.warn('Reflection mood must be number between 1-5', reflection);
            return false;
        }
        
        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(reflection.date)) {
            console.warn('Reflection date must be in YYYY-MM-DD format', reflection);
            return false;
        }
        
        return true;
    }
    
    // Full data operations
    getFullData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error reading storage data:', error);
            return null;
        }
    }
    
    setFullData(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error writing storage data:', error);
            return false;
        }
    }
    
    clearAllData() {
        try {
            localStorage.removeItem(this.storageKey);
            this.initializeDefaultData();
            return true;
        } catch (error) {
            console.error('Error clearing storage data:', error);
            return false;
        }
    }
    
    exportData(format = 'json') {
        const data = this.getFullData();
        
        if (format === 'json') {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            return blob;
        } else if (format === 'csv') {
            // Convert tasks to CSV
            const tasksCsv = this.convertTasksToCSV(data.tasks);
            const blob = new Blob([tasksCsv], { type: 'text/csv' });
            return blob;
        }
        
        return null;
    }
    
    importData(jsonData) {
        try {
            const importedData = JSON.parse(jsonData);
            
            // Validate imported data structure
            if (!importedData || typeof importedData !== 'object') {
                throw new Error('Invalid data format');
            }
            
            // Merge with existing data (prefer imported data)
            const existingData = this.getFullData() || {};
            const mergedData = {
                ...existingData,
                ...importedData,
                // Don't overwrite version
                version: this.version
            };
            
            // Validate merged data
            this.setFullData(mergedData);
            this.validateData();
            
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }
    
    // Individual data operations
    getTasks() {
        const data = this.getFullData();
        return data ? data.tasks : [];
    }
    
    setTasks(tasks) {
        const data = this.getFullData();
        if (data) {
            data.tasks = tasks;
            this.updateStatistics();
            return this.setFullData(data);
        }
        return false;
    }
    
    getSettings() {
        const data = this.getFullData();
        return data ? data.settings : this.getDefaultSettings();
    }
    
    setSettings(settings) {
        const data = this.getFullData();
        if (data) {
            data.settings = { ...data.settings, ...settings };
            return this.setFullData(data);
        }
        return false;
    }
    
    getStreak() {
        const data = this.getFullData();
        return data ? data.streak : 0;
    }
    
    setStreak(streak) {
        const data = this.getFullData();
        if (data) {
            data.streak = streak;
            
            // Update longest streak if current is longer
            if (streak > data.statistics.longestStreak) {
                data.statistics.longestStreak = streak;
            }
            
            return this.setFullData(data);
        }
        return false;
    }
    
    getSkipBank() {
        const data = this.getFullData();
        return data ? data.skipBank : [];
    }
    
    setSkipBank(skipBank) {
        const data = this.getFullData();
        if (data) {
            data.skipBank = skipBank;
            return this.setFullData(data);
        }
        return false;
    }
    
    getLastActivity() {
        const data = this.getFullData();
        return data ? data.lastActivity : new Date().toISOString().split('T')[0];
    }
    
    setLastActivity(date) {
        const data = this.getFullData();
        if (data) {
            data.lastActivity = date;
            return this.setFullData(data);
        }
        return false;
    }
    
    getReflections() {
        const data = this.getFullData();
        return data ? data.reflections : [];
    }
    
    addReflection(reflection) {
        const data = this.getFullData();
        if (data) {
            // Validate reflection
            if (!this.validateReflection(reflection)) {
                return false;
            }
            
            // Remove existing reflection for same date
            data.reflections = data.reflections.filter(r => r.date !== reflection.date);
            
            // Add new reflection
            data.reflections.push(reflection);
            
            // Update statistics
            this.updateReflectionStatistics(reflection);
            
            return this.setFullData(data);
        }
        return false;
    }
    
    getStatistics() {
        const data = this.getFullData();
        return data ? data.statistics : this.initializeStatistics();
    }
    
    updateStatistics() {
        const data = this.getFullData();
        if (!data) return false;
        
        const stats = data.statistics;
        const tasks = data.tasks;
        const now = new Date();
        
        // Basic counts
        stats.totalTasksCreated = tasks.length;
        stats.totalTasksCompleted = tasks.filter(t => t.completed).length;
        stats.totalTasksSkipped = tasks.filter(t => t.skipped).length;
        stats.currentStreak = data.streak;
        
        // Calculate completion rate
        if (tasks.length > 0) {
            const completedRate = (stats.totalTasksCompleted / tasks.length) * 100;
            const skippedRate = (stats.totalTasksSkipped / tasks.length) * 100;
            stats.averageCompletionRate = completedRate;
        }
        
        // Update productivity by hour
        const hourlyProductivity = new Array(24).fill(0);
        tasks.forEach(task => {
            if (task.completed && task.completedAt) {
                const hour = new Date(task.completedAt).getHours();
                hourlyProductivity[hour]++;
            }
        });
        stats.productivityByHour = hourlyProductivity;
        
        // Update productivity by day
        const dailyProductivity = new Array(7).fill(0);
        tasks.forEach(task => {
            if (task.completed && task.completedAt) {
                const day = new Date(task.completedAt).getDay();
                dailyProductivity[day]++;
            }
        });
        stats.productivityByDay = dailyProductivity;
        
        // Update skip reasons
        const skipReasons = {};
        data.skipBank.forEach(entry => {
            skipReasons[entry.reason] = (skipReasons[entry.reason] || 0) + 1;
        });
        stats.skipReasons = skipReasons;
        
        // Update completion times
        const completionTimes = tasks
            .filter(t => t.completed && t.createdAt && t.completedAt)
            .map(t => {
                const created = new Date(t.createdAt);
                const completed = new Date(t.completedAt);
                return completed.getTime() - created.getTime(); // in milliseconds
            });
        stats.completionTimes = completionTimes;
        
        stats.lastUpdated = now.toISOString();
        
        return this.setFullData(data);
    }
    
    updateReflectionStatistics(reflection) {
        const data = this.getFullData();
        if (!data) return false;
        
        const stats = data.statistics;
        
        // Update mood averages if needed
        // This is a simplified version - you might want more sophisticated statistics
        
        stats.lastUpdated = new Date().toISOString();
        
        return this.setFullData(data);
    }
    
    // Task-specific operations
    addTask(task) {
        const tasks = this.getTasks();
        
        // Validate and set defaults
        if (!this.validateTask(task)) {
            return false;
        }
        
        tasks.push(task);
        const success = this.setTasks(tasks);
        
        if (success) {
            // Update statistics
            this.updateStatistics();
        }
        
        return success;
    }
    
    updateTask(taskId, updates) {
        const tasks = this.getTasks();
        const index = tasks.findIndex(t => t.id == taskId);
        
        if (index === -1) return false;
        
        // Apply updates
        tasks[index] = { ...tasks[index], ...updates };
        
        // Re-validate
        if (!this.validateTask(tasks[index])) {
            return false;
        }
        
        const success = this.setTasks(tasks);
        
        if (success) {
            this.updateStatistics();
        }
        
        return success;
    }
    
    deleteTask(taskId) {
        const tasks = this.getTasks();
        const filteredTasks = tasks.filter(t => t.id != taskId);
        
        if (filteredTasks.length === tasks.length) return false;
        
        const success = this.setTasks(filteredTasks);
        
        if (success) {
            this.updateStatistics();
        }
        
        return success;
    }
    
    getTask(taskId) {
        const tasks = this.getTasks();
        return tasks.find(t => t.id == taskId);
    }
    
    getTasksByDate(date = null) {
        const targetDate = date || new Date().toISOString().split('T')[0];
        const tasks = this.getTasks();
        return tasks.filter(task => task.date === targetDate);
    }
    
    getTasksByDateRange(startDate, endDate) {
        const tasks = this.getTasks();
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return tasks.filter(task => {
            const taskDate = new Date(task.date);
            return taskDate >= start && taskDate <= end;
        });
    }
    
    // Utility methods
    convertTasksToCSV(tasks) {
        const headers = ['Date', 'Time', 'Title', 'Duration', 'Must Do', 'Completed', 'Skipped', 'Skip Reason', 'Notes'];
        const rows = tasks.map(task => [
            task.date,
            task.time,
            `"${task.title.replace(/"/g, '""')}"`,
            task.duration,
            task.mustDo ? 'Yes' : 'No',
            task.completed ? 'Yes' : 'No',
            task.skipped ? 'Yes' : 'No',
            `"${task.skipReason.replace(/"/g, '""')}"`,
            `"${task.notes.replace(/"/g, '""')}"`
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
        
        return csvContent;
    }
    
    getStorageUsage() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (!data) return { used: 0, total: 0, percent: 0 };
            
            const used = new Blob([data]).size;
            
            // Estimate total available (5MB for most browsers)
            const total = 5 * 1024 * 1024;
            const percent = (used / total) * 100;
            
            return {
                used: this.formatBytes(used),
                total: this.formatBytes(total),
                percent: Math.round(percent),
                rawUsed: used,
                rawTotal: total
            };
        } catch (error) {
            console.error('Error calculating storage usage:', error);
            return { used: 'Unknown', total: 'Unknown', percent: 0 };
        }
    }
    
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
    
    backupData() {
        const data = this.getFullData();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `momentum-backup-${timestamp}.json`;
        
        return {
            data: JSON.stringify(data, null, 2),
            filename: filename,
            timestamp: timestamp
        };
    }
    
    compressData() {
        // Remove old completed tasks (older than 30 days)
        const tasks = this.getTasks();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const compressedTasks = tasks.filter(task => {
            if (task.completed && task.completedAt) {
                const completedDate = new Date(task.completedAt);
                return completedDate >= thirtyDaysAgo;
            }
            return true; // Keep incomplete tasks
        });
        
        if (compressedTasks.length < tasks.length) {
            this.setTasks(compressedTasks);
            return tasks.length - compressedTasks.length;
        }
        
        return 0;
    }
}

// Initialize storage manager
const storageManager = new StorageManager();

// Export for use in other files
window.storageManager = storageManager;

// Provide backward compatibility for existing code
window.getStoredTasks = () => storageManager.getTasks();
window.setStoredTasks = (tasks) => storageManager.setTasks(tasks);
window.getStoredSettings = () => storageManager.getSettings();
window.setStoredSettings = (settings) => storageManager.setSettings(settings);
window.getStoredStreak = () => storageManager.getStreak();
window.setStoredStreak = (streak) => storageManager.setStreak(streak);
window.getSkipBank = () => storageManager.getSkipBank();
window.setSkipBank = (skipBank) => storageManager.setSkipBank(skipBank);

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check storage usage
    const usage = storageManager.getStorageUsage();
    if (usage.percent > 80) {
        console.warn(`Storage usage is high: ${usage.percent}%`);
        
        // Auto-compress if storage is almost full
        if (usage.percent > 90) {
            const removed = storageManager.compressData();
            if (removed > 0) {
                console.log(`Automatically removed ${removed} old tasks to free up space`);
            }
        }
    }
    
    // Log storage status
    console.log(`Momentum storage: ${usage.used} / ${usage.total} (${usage.percent}%)`);
});
