const { MongoClient } = require('mongodb');
const fs = require('fs');
require('dotenv').config();

async function migrateData() {
    // 로컬 MongoDB 연결
    const localClient = new MongoClient('mongodb://localhost:27017');
    await localClient.connect();
    const localDb = localClient.db('baseball_fan');

    // AWS DocumentDB 연결
    const awsClient = new MongoClient(process.env.MONGODB_URI, {
        ssl: true,
        sslValidate: false,
        sslCA: fs.readFileSync('./rds-combined-ca-bundle.pem')
    });
    await awsClient.connect();
    const awsDb = awsClient.db('baseball_fan');

    try {
        // 컬렉션 목록 가져오기
        const collections = await localDb.listCollections().toArray();
        
        for (const collection of collections) {
            const collectionName = collection.name;
            console.log(`Migrating collection: ${collectionName}`);
            
            // 데이터 가져오기
            const data = await localDb.collection(collectionName).find({}).toArray();
            
            if (data.length > 0) {
                // AWS DocumentDB에 데이터 삽입
                await awsDb.collection(collectionName).insertMany(data);
                console.log(`Migrated ${data.length} documents to ${collectionName}`);
            }
        }
        
        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await localClient.close();
        await awsClient.close();
    }
}

migrateData(); 