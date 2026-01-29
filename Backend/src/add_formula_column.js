import db from './db.js';

(async function(){
  try{
    const { rows } = await db.query("PRAGMA table_info(products);");
    const hasFormula = rows && rows.some(r => r.name === 'formula');
    if (hasFormula) {
      console.log('products table already has formula column');
    } else {
      console.log('Adding formula column to products...');
      await db.query("ALTER TABLE products ADD COLUMN formula TEXT;");
      console.log('Added column. Populating formula from sku where available...');
      await db.query("UPDATE products SET formula = sku WHERE formula IS NULL OR formula = '';");
      console.log('Populated formula column.');
    }

    const { rows: check } = await db.query("SELECT id, name, sku, formula FROM products LIMIT 5;");
    console.log('Sample rows:', JSON.stringify(check, null, 2));
  } catch (e) {
    console.error('Error updating schema', e);
  }
  process.exit(0);
})();
