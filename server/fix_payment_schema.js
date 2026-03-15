require('dotenv').config();
const { pool } = require('./config/db');

async function runMigration() {
    try {
        console.log('Running migration to fix payments column...');
        
        try {
            await pool.query('ALTER TABLE payments CHANGE `change` change_amount DECIMAL(10,2) DEFAULT 0.00;');
            console.log('Successfully renamed `change` to `change_amount`.');
        } catch (err) {
            console.log('Could not rename `change` to `change_amount` (might already be fixed):', err.message);
        }
        
        // Also ensure change_amount is added if missing
        try {
            await pool.query('ALTER TABLE payments ADD COLUMN change_amount DECIMAL(10,2) DEFAULT 0.00;');
            console.log('Successfully added `change_amount` column.');
        } catch (err) {
            console.log('Could not add `change_amount` column (might already exist):', err.message);
        }

        console.log('Migration completed.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
