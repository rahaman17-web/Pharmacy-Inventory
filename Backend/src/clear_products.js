import db from "./db.js";

async function clearProducts() {
  try {
    console.log("Clearing all products from the database...");
    
    // Delete all products (cascades to batches)
    const result = await db.query("DELETE FROM products");
    
    console.log(`✓ Successfully cleared all products from the database`);
    console.log(`  Rows affected: ${result.rowCount || 0}`);
    console.log("\nThe database is now empty. Add products via Purchase Invoice.");
    
    process.exit(0);
  } catch (err) {
    console.error("Error clearing products:", err);
    process.exit(1);
  }
}

clearProducts();
