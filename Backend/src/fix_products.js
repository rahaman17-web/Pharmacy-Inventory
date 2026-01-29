import db from "./db.js";

async function fixProducts() {
  try {
    const { rows } = await db.query("SELECT id, name, mrp, selling_price, formula FROM products");
    for (const r of rows) {
      const updates = {};

      // Normalize numeric values
      const mrpVal = r.mrp === null || r.mrp === undefined || r.mrp === '' ? null : Number(r.mrp);
      const sellVal = r.selling_price === null || r.selling_price === undefined || r.selling_price === '' ? null : Number(r.selling_price);

      // If mrp missing but selling exists, set mrp = selling
      if ((mrpVal === null || Number.isNaN(mrpVal)) && sellVal !== null && !Number.isNaN(sellVal)) {
        updates.mrp = sellVal;
      }

      // If selling_price missing or <= 0, set it to mrp (or 0)
      const effectiveMrp = updates.mrp !== undefined ? Number(updates.mrp) : (mrpVal !== null && !Number.isNaN(mrpVal) ? mrpVal : 0);
      if (sellVal === null || Number.isNaN(sellVal) || Number(sellVal) <= 0) {
        updates.selling_price = effectiveMrp;
      }

      // If selling_price is present but less than mrp, normalize it to mrp
      if (sellVal !== null && !Number.isNaN(sellVal) && Number(sellVal) < effectiveMrp) {
        updates.selling_price = effectiveMrp;
      }

      // Ensure mrp is at least 0
      if ((mrpVal === null || Number.isNaN(mrpVal)) && updates.mrp === undefined) {
        updates.mrp = 0;
      }

      // Fill formula if missing (derive small human-friendly string from name)
      if (!r.formula || String(r.formula).trim() === "") {
        const name = r.name || "";
        const derived = name.split(/[,\-\/()]/)[0].replace(/[^a-zA-Z0-9+\s]/g, "").trim();
        updates.formula = derived || null;
      }

      if (Object.keys(updates).length > 0) {
        const parts = [];
        const vals = [];
        let i = 1;
        for (const k of Object.keys(updates)) {
          parts.push(`${k} = $${i++}`);
          vals.push(updates[k]);
        }
        vals.push(r.id);
        const sql = `UPDATE products SET ${parts.join(", ")} WHERE id = $${i}`;
        await db.query(sql, vals);
        console.log(`Updated product id=${r.id}`, updates);
      }
    }
    console.log("Product normalization complete");
    process.exit(0);
  } catch (err) {
    console.error("Failed to normalize products:", err);
    process.exit(1);
  }
}

fixProducts();
