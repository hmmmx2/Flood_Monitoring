const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']); // Use public DNS to resolve MongoDB Atlas SRV records

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const URI = 'mongodb+srv://jonathantang2016_db_user:jona88@cluster0.5cq209e.mongodb.net/IoT_WaterMonitoring?retryWrites=true&w=majority';
const OUTPUT_DIR = path.join(__dirname, 'mongodb-export');

async function exportCollections() {
  const client = new MongoClient(URI);

  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected successfully.\n');

    const db = client.db('IoT_WaterMonitoring');
    const collections = await db.listCollections().toArray();

    if (collections.length === 0) {
      console.log('No collections found in the database.');
      return;
    }

    console.log(`Found ${collections.length} collection(s): ${collections.map(c => c.name).join(', ')}\n`);

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    for (const col of collections) {
      const name = col.name;
      console.log(`Exporting collection: ${name}...`);
      const docs = await db.collection(name).find({}).toArray();
      const filePath = path.join(OUTPUT_DIR, `${name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');
      console.log(`  -> Saved ${docs.length} document(s) to ${filePath}`);
    }

    console.log('\nExport complete!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.close();
  }
}

exportCollections();
