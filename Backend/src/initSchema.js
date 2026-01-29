import db from './db.js';
import dotenv from 'dotenv';

dotenv.config();

export default async function ensureSchema() {
  try {
    // Postgres-only setup: migrations handle schema. Nothing to do at runtime.
    return;

    const { rows } = await db.query("PRAGMA table_info(products);");
    const hasFormula = rows && rows.some(r => r.name === 'formula');
    if (!hasFormula) {
      console.log('Adding formula column to products...');
      await db.query("ALTER TABLE products ADD COLUMN formula TEXT;");
      // Best-effort backfill from legacy `sku` if it exists.
      try {
        const { rows: cols } = await db.query("PRAGMA table_info(products);");
        const hasSku = cols && cols.some(r => r.name === 'sku');
        if (hasSku) {
          await db.query("UPDATE products SET formula = sku WHERE (formula IS NULL OR formula = '') AND (sku IS NOT NULL AND sku != '');");
        }
      } catch (e) {
        console.error('Formula backfill skipped (non-fatal):', e.message || e);
      }
      console.log('Formula column ensured.');
    }

    const hasCategory = rows && rows.some(r => r.name === 'category');
    if (!hasCategory) {
      console.log('Adding category column to products...');
      await db.query("ALTER TABLE products ADD COLUMN category TEXT;");
      try {
        await db.query("UPDATE products SET category = 'Medicine' WHERE category IS NULL OR category = '';" );
      } catch (e) {
        console.error('Category backfill failed (non-fatal):', e.message || e);
      }
      console.log('Category column ensured.');
    }

    const hasGst = rows && rows.some(r => r.name === 'gst_percentage');
    if (!hasGst) {
      console.log('Adding gst_percentage column to products...');
      await db.query("ALTER TABLE products ADD COLUMN gst_percentage REAL;");
      console.log('gst_percentage column ensured.');
    }

    // Purchase item extensions for offers/bonuses
    try {
      const { rows: pCols } = await db.query("PRAGMA table_info(purchase_items);");
      if (pCols && pCols.length) {
        const hasBonusQty = pCols.some(r => r.name === 'bonus_qty');
        if (!hasBonusQty) {
          console.log('Adding bonus_qty column to purchase_items...');
          await db.query("ALTER TABLE purchase_items ADD COLUMN bonus_qty INTEGER DEFAULT 0;");
        }
        const hasLineTotal = pCols.some(r => r.name === 'line_total');
        if (!hasLineTotal) {
          console.log('Adding line_total column to purchase_items...');
          await db.query("ALTER TABLE purchase_items ADD COLUMN line_total REAL DEFAULT 0;");
        }
      }
    } catch (e) {
      console.error('Purchase item schema ensure failed (non-fatal):', e.message || e);
    }

    // Returns schema (best-effort)
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS returns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id INTEGER NOT NULL,
          user_id INTEGER,
          total REAL DEFAULT 0,
          reason TEXT,
          created_at DATETIME DEFAULT (datetime('now')),
          FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS return_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          return_id INTEGER NOT NULL,
          sale_item_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          batch_id INTEGER NOT NULL,
          qty INTEGER NOT NULL,
          unit_price REAL NOT NULL,
          unit_cost REAL DEFAULT 0,
          FOREIGN KEY(return_id) REFERENCES returns(id) ON DELETE CASCADE,
          FOREIGN KEY(sale_item_id) REFERENCES sale_items(id),
          FOREIGN KEY(product_id) REFERENCES products(id),
          FOREIGN KEY(batch_id) REFERENCES batches(id)
        )
      `);
    } catch (e) {
      console.error('Returns schema ensure failed (non-fatal):', e.message || e);
    }

    // unit_cost columns for profit calculations (best-effort)
    try {
      const { rows: siCols } = await db.query("PRAGMA table_info(sale_items);");
      if (siCols && siCols.length) {
        const hasUnitCost = siCols.some(r => r.name === 'unit_cost');
        if (!hasUnitCost) {
          console.log('Adding unit_cost column to sale_items...');
          await db.query("ALTER TABLE sale_items ADD COLUMN unit_cost REAL DEFAULT 0;");
        }
      }
    } catch (e) {
      console.error('Sale items unit_cost ensure failed (non-fatal):', e.message || e);
    }

    try {
      const { rows: riCols } = await db.query("PRAGMA table_info(return_items);");
      if (riCols && riCols.length) {
        const hasUnitCost = riCols.some(r => r.name === 'unit_cost');
        if (!hasUnitCost) {
          console.log('Adding unit_cost column to return_items...');
          await db.query("ALTER TABLE return_items ADD COLUMN unit_cost REAL DEFAULT 0;");
        }
      }
    } catch (e) {
      console.error('Return items unit_cost ensure failed (non-fatal):', e.message || e);
    }

    // Expenses table for net + profit reporting (best-effort)
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          amount REAL NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT (datetime('now')),
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `);
    } catch (e) {
      console.error('Expenses schema ensure failed (non-fatal):', e.message || e);
    }

    // Backfills (best-effort): make sure we have a buy-price for profit calculations
    try {
      // If older data has batch.cost = 0, compute it from purchase_items for that batch.
      // Weighted average by (qty + bonus_qty).
      await db.query(`
        UPDATE batches
        SET cost = (
          SELECT
            CASE
              WHEN COALESCE(SUM(COALESCE(pi.qty,0) + COALESCE(pi.bonus_qty,0)), 0) > 0
              THEN COALESCE(SUM(COALESCE(pi.unit_price,0) * (COALESCE(pi.qty,0) + COALESCE(pi.bonus_qty,0))), 0)
                   / SUM(COALESCE(pi.qty,0) + COALESCE(pi.bonus_qty,0))
              ELSE cost
            END
          FROM purchase_items pi
          WHERE pi.batch_id = batches.id
        )
        WHERE (cost IS NULL OR cost = 0)
          AND EXISTS (SELECT 1 FROM purchase_items pi WHERE pi.batch_id = batches.id)
      `);
    } catch (e) {
      console.error('Batch cost backfill failed (non-fatal):', e.message || e);
    }

    try {
      // Backfill sale_items.unit_cost from batches.cost if missing/0
      await db.query(`
        UPDATE sale_items
        SET unit_cost = (
          SELECT COALESCE(b.cost, 0)
          FROM batches b
          WHERE b.id = sale_items.batch_id
        )
        WHERE (unit_cost IS NULL OR unit_cost = 0)
          AND batch_id IS NOT NULL
          AND EXISTS (SELECT 1 FROM batches b WHERE b.id = sale_items.batch_id AND COALESCE(b.cost, 0) > 0)
      `);
    } catch (e) {
      console.error('Sale item unit_cost backfill failed (non-fatal):', e.message || e);
    }

    try {
      // Backfill return_items.unit_cost from sale_items.unit_cost if missing/0
      await db.query(`
        UPDATE return_items
        SET unit_cost = (
          SELECT COALESCE(si.unit_cost, 0)
          FROM sale_items si
          WHERE si.id = return_items.sale_item_id
        )
        WHERE (unit_cost IS NULL OR unit_cost = 0)
          AND EXISTS (SELECT 1 FROM sale_items si WHERE si.id = return_items.sale_item_id AND COALESCE(si.unit_cost, 0) > 0)
      `);
    } catch (e) {
      console.error('Return item unit_cost backfill failed (non-fatal):', e.message || e);
    }
  } catch (e) {
    console.error('Error ensuring schema:', e && e.message ? e.message : e);
  }
}
