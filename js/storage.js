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
            settings: this.getDefault
