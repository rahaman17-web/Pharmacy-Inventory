import dotenv from 'dotenv';
import db from './db.js';
import bcrypt from 'bcrypt';

dotenv.config();

async function run() {
  const client = await db.getClient();
  try {

    // create admin user
    const password = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
    const username = process.env.ADMIN_USER || 'admin';
    
    // Check if admin user exists
    const userCheck = await client.query(`SELECT * FROM users WHERE username = $1`, [username]);
    if (userCheck.rows.length === 0) {
      await client.query(
        `INSERT INTO users (username, password, role) VALUES ($1,$2,$3)`,
        [username, password, 'admin']
      );
    }

    // sample supplier
    const supplierCheck = await client.query(`SELECT * FROM suppliers WHERE name = $1`, ['Default Supplier']);
    if (supplierCheck.rows.length === 0) {
      await client.query(
        `INSERT INTO suppliers (name, phone, address) VALUES ($1,$2,$3)`,
        ['Default Supplier', '0000000000', 'Head Office']
      );
    }

    // sample products and batches - Common Pakistani pharmacy medicines
    const products = [
      // Pain & Fever
      { name: 'Paracetamol 500mg', formula: 'Paracetamol', mrp: 50, selling_price: 45 },
      { name: 'Ibuprofen 200mg', formula: 'Ibuprofen', mrp: 80, selling_price: 70 },
      { name: 'Ibuprofen 400mg', formula: 'Ibuprofen', mrp: 120, selling_price: 105 },
      { name: 'Aspirin 75mg', formula: 'Aspirin', mrp: 40, selling_price: 35 },
      { name: 'Aspirin 300mg', formula: 'Aspirin', mrp: 60, selling_price: 50 },
      { name: 'Diclofenac 50mg', formula: 'Diclofenac', mrp: 85, selling_price: 75 },
      { name: 'Tramadol 50mg', formula: 'Tramadol', mrp: 95, selling_price: 80 },
      { name: 'Panadol Extra', formula: 'Paracetamol', mrp: 65, selling_price: 55 },
      { name: 'Brufen 400mg', formula: 'Ibuprofen', mrp: 130, selling_price: 115 },
      { name: 'Disprin', formula: 'Aspirin', mrp: 45, selling_price: 38 },
      
      // Antibiotics
      { name: 'Amoxicillin 500mg', formula: 'Amoxicillin', mrp: 150, selling_price: 135 },
      { name: 'Amoxicillin 250mg', formula: 'Amoxicillin', mrp: 90, selling_price: 75 },
      { name: 'Azithromycin 250mg', formula: 'Azithromycin', mrp: 200, selling_price: 180 },
      { name: 'Azithromycin 500mg', formula: 'Azithromycin', mrp: 350, selling_price: 315 },
      { name: 'Ciprofloxacin 500mg', formula: 'Ciprofloxacin', mrp: 180, selling_price: 160 },
      { name: 'Augmentin 625mg', formula: 'Amoxicillin + Clavulanate', mrp: 280, selling_price: 250 },
      { name: 'Amoxicillin + Clavulanic Acid', formula: 'Amoxicillin + Clavulanic Acid', mrp: 220, selling_price: 195 },
      { name: 'Cefixime 200mg', formula: 'Cefixime', mrp: 240, selling_price: 215 },
      { name: 'Cefixime 400mg', formula: 'Cefixime', mrp: 380, selling_price: 340 },
      { name: 'Clarithromycin 250mg', formula: 'Clarithromycin', mrp: 190, selling_price: 170 },
      { name: 'Levofloxacin 500mg', formula: 'Levofloxacin', mrp: 210, selling_price: 190 },
      { name: 'Metronidazole 400mg', formula: 'Metronidazole', mrp: 70, selling_price: 60 },
      
      // Gastrointestinal
      { name: 'Omeprazole 20mg', formula: 'Omeprazole', mrp: 120, selling_price: 100 },
      { name: 'Omeprazole 40mg', formula: 'Omeprazole', mrp: 180, selling_price: 160 },
      { name: 'Pantoprazole 40mg', formula: 'Pantoprazole', mrp: 135, selling_price: 115 },
      { name: 'Esomeprazole 40mg', formula: 'Esomeprazole', mrp: 160, selling_price: 140 },
      { name: 'Ranitidine 150mg', formula: 'Ranitidine', mrp: 55, selling_price: 45 },
      { name: 'Domperidone 10mg', formula: 'Domperidone', mrp: 85, selling_price: 70 },
      { name: 'Motilium', formula: 'Domperidone', mrp: 95, selling_price: 80 },
      { name: 'Loperamide 2mg', formula: 'Loperamide', mrp: 65, selling_price: 55 },
      { name: 'ORS Sachet', formula: 'Oral Rehydration Salts', mrp: 25, selling_price: 20 },
      { name: 'Bisacodyl 5mg', formula: 'Bisacodyl', mrp: 45, selling_price: 38 },
      
      // Allergy & Cold
      { name: 'Cetirizine 10mg', formula: 'Cetirizine', mrp: 60, selling_price: 50 },
      { name: 'Loratadine 10mg', formula: 'Loratadine', mrp: 70, selling_price: 60 },
      { name: 'Fexofenadine 120mg', formula: 'Fexofenadine', mrp: 110, selling_price: 95 },
      { name: 'Chlorpheniramine 4mg', formula: 'Chlorpheniramine', mrp: 35, selling_price: 28 },
      { name: 'Montelukast 10mg', formula: 'Montelukast', mrp: 160, selling_price: 140 },
      { name: 'Cough Syrup', formula: 'Dextromethorphan', mrp: 110, selling_price: 95 },
      { name: 'Actifed Syrup', formula: 'Triprolidine + Pseudoephedrine', mrp: 125, selling_price: 110 },
      { name: 'Dextromethorphan Syrup', formula: 'Dextromethorphan', mrp: 95, selling_price: 80 },
      
      // Respiratory
      { name: 'Salbutamol Inhaler', formula: 'Salbutamol', mrp: 250, selling_price: 220 },
      { name: 'Ventolin Inhaler', formula: 'Salbutamol', mrp: 280, selling_price: 250 },
      { name: 'Seretide Inhaler', formula: 'Fluticasone + Salmeterol', mrp: 1200, selling_price: 1050 },
      { name: 'Prednisolone 5mg', formula: 'Prednisolone', mrp: 75, selling_price: 65 },
      { name: 'Dexamethasone 0.5mg', formula: 'Dexamethasone', mrp: 45, selling_price: 38 },
      
      // Diabetes
      { name: 'Metformin 500mg', formula: 'Metformin', mrp: 90, selling_price: 75 },
      { name: 'Metformin 850mg', formula: 'Metformin', mrp: 125, selling_price: 110 },
      { name: 'Glimepiride 1mg', formula: 'Glimepiride', mrp: 105, selling_price: 90 },
      { name: 'Glimepiride 2mg', formula: 'Glimepiride', mrp: 145, selling_price: 130 },
      { name: 'Gliclazide 80mg', formula: 'Gliclazide', mrp: 135, selling_price: 120 },
      { name: 'Insulin Glargine', formula: 'Insulin Glargine', mrp: 1200, selling_price: 1050 },
      { name: 'Insulin Mixtard', formula: 'Human Insulin', mrp: 950, selling_price: 850 },
      { name: 'Glucophage 500mg', formula: 'Metformin', mrp: 110, selling_price: 95 },
      
      // Blood Pressure
      { name: 'Losartan 50mg', formula: 'Losartan', mrp: 130, selling_price: 115 },
      { name: 'Losartan 100mg', formula: 'Losartan', mrp: 190, selling_price: 170 },
      { name: 'Amlodipine 5mg', formula: 'Amlodipine', mrp: 95, selling_price: 80 },
      { name: 'Amlodipine 10mg', formula: 'Amlodipine', mrp: 140, selling_price: 125 },
      { name: 'Atenolol 50mg', formula: 'Atenolol', mrp: 75, selling_price: 65 },
      { name: 'Bisoprolol 5mg', formula: 'Bisoprolol', mrp: 115, selling_price: 100 },
      { name: 'Enalapril 5mg', formula: 'Enalapril', mrp: 85, selling_price: 70 },
      { name: 'Telmisartan 40mg', formula: 'Telmisartan', mrp: 155, selling_price: 140 },
      { name: 'Valsartan 80mg', formula: 'Valsartan', mrp: 145, selling_price: 130 },
      
      // Cholesterol
      { name: 'Atorvastatin 10mg', formula: 'Atorvastatin', mrp: 140, selling_price: 125 },
      { name: 'Atorvastatin 20mg', formula: 'Atorvastatin', mrp: 210, selling_price: 190 },
      { name: 'Simvastatin 20mg', formula: 'Simvastatin', mrp: 115, selling_price: 100 },
      { name: 'Rosuvastatin 10mg', formula: 'Rosuvastatin', mrp: 180, selling_price: 160 },
      
      // Mental Health
      { name: 'Sertraline 50mg', formula: 'Sertraline', mrp: 175, selling_price: 155 },
      { name: 'Fluoxetine 20mg', formula: 'Fluoxetine', mrp: 145, selling_price: 130 },
      { name: 'Alprazolam 0.5mg', formula: 'Alprazolam', mrp: 95, selling_price: 80 },
      { name: 'Diazepam 5mg', formula: 'Diazepam', mrp: 65, selling_price: 55 },
      { name: 'Risperidone 2mg', formula: 'Risperidone', mrp: 185, selling_price: 165 },
      
      // Thyroid
      { name: 'Levothyroxine 50mcg', formula: 'Levothyroxine', mrp: 75, selling_price: 65 },
      { name: 'Levothyroxine 100mcg', formula: 'Levothyroxine', mrp: 95, selling_price: 80 },
      
      // Vitamins & Supplements
      { name: 'Vitamin C 500mg', formula: 'Vitamin C', mrp: 70, selling_price: 60 },
      { name: 'Vitamin D3 60000IU', formula: 'Vitamin D3', mrp: 85, selling_price: 70 },
      { name: 'Calcium + Vitamin D', formula: 'Calcium + Vitamin D', mrp: 120, selling_price: 105 },
      { name: 'Multivitamin', formula: 'Multiple Vitamins', mrp: 150, selling_price: 135 },
      { name: 'Folic Acid 5mg', formula: 'Folic Acid', mrp: 45, selling_price: 38 },
      { name: 'Iron + Folic Acid', formula: 'Iron + Folic Acid', mrp: 85, selling_price: 70 },
      { name: 'Vitamin B Complex', formula: 'Vitamin B Complex', mrp: 95, selling_price: 80 },
      { name: 'Zinc Sulfate', formula: 'Zinc Sulfate', mrp: 75, selling_price: 65 },
      
      // Others
      { name: 'Mefenamic Acid 500mg', formula: 'Mefenamic Acid', mrp: 95, selling_price: 80 },
      { name: 'Paracetamol + Caffeine', formula: 'Paracetamol + Caffeine', mrp: 75, selling_price: 65 },
      { name: 'Hyoscine 10mg', formula: 'Hyoscine', mrp: 110, selling_price: 95 },
      { name: 'Betamethasone Cream', formula: 'Betamethasone', mrp: 85, selling_price: 70 },
      { name: 'Clotrimazole Cream', formula: 'Clotrimazole', mrp: 95, selling_price: 80 },
      { name: 'Povidone Iodine', formula: 'Povidone Iodine', mrp: 65, selling_price: 55 },
      { name: 'Hydrogen Peroxide', formula: 'Hydrogen Peroxide', mrp: 45, selling_price: 38 },
      { name: 'Eye Drops Refresh', formula: 'Carboxymethylcellulose', mrp: 125, selling_price: 110 },
    ];

    for (const p of products) {
      // Check if product exists first
      let checkRes = await client.query(`SELECT * FROM products WHERE name = $1`, [p.name]);
      let prod = checkRes.rows[0];
      
      if (!prod) {
        // Insert new product
        await client.query(
          `INSERT INTO products (name, formula, mrp, selling_price) VALUES ($1,$2,$3,$4)`,
          [p.name, p.formula, p.mrp, p.selling_price]
        );
        // Query to get the inserted product
        checkRes = await client.query(`SELECT * FROM products WHERE name = $1`, [p.name]);
        prod = checkRes.rows[0];
        console.log(`Created product: ${p.name}`);
      } else {
        console.log(`Product already exists: ${p.name}`);
      }
      
      if (!prod) {
        console.warn('Skipping batch creation; product not found', p.sku);
        continue;
      }
      
      // Check if batch already exists for this product
      const batchCheck = await client.query(
        `SELECT * FROM batches WHERE product_id = $1`,
        [prod.id]
      );
      
      if (batchCheck.rows.length === 0) {
        // No batches exist, create one
        await client.query(
          `INSERT INTO batches (product_id, batch_no, expiry, qty, cost) VALUES ($1,$2,$3,$4,$5)`,
          [prod.id, 'BATCH1', new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().split('T')[0], 100, p.mrp * 0.6]
        );
        console.log(`Created batch for ${p.name} with 100 units`);
      } else {
        console.log(`Batch already exists for ${p.name}, current stock: ${batchCheck.rows.reduce((sum, b) => sum + b.qty, 0)}`);
      }
    }

    console.log('Seed completed');
  } catch (err) {
    console.error('Seed failed', err);
  } finally {
    try {
      if (client && typeof client.release === 'function') client.release();
    } catch (e) {
      console.error('Error releasing client', e);
    }
    // Do not call process.exit() here. Allow Node to exit naturally so
    // underlying libuv handles can close cleanly on Windows.
  }
}

run();
