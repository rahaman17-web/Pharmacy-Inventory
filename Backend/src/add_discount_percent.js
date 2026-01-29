import db from './db.js';

async function addDiscountPercentColumn() {
  try {
    console.log('Adding discount_percent column to sale_items...');
    
    // Check if column already exists (SQLite doesn't support IF NOT EXISTS in ALTER TABLE)
    try {
      await db.query(`SELECT discount_percent FROM sale_items LIMIT 1`);
      console.log('Column discount_percent already exists, skipping.');
      return;
    } catch (e) {
      // Column doesn't exist, proceed with adding it
    }
    
    // Add the column
    await db.query(`ALTER TABLE sale_items ADD COLUMN discount_percent REAL DEFAULT 0`);
    console.log('✅ Successfully added discount_percent column to sale_items');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error adding column:', err);
    process.exit(1);
  }
}

addDiscountPercentColumn();
