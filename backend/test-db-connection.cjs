const { Client } = require('pg');

const testConnections = [
  { host: 'localhost', port: 5432, user: 'postgres', password: '', database: 'postgres' },
  { host: 'localhost', port: 5432, user: 'postgres', password: 'password', database: 'postgres' },
  { host: 'localhost', port: 5432, user: 'postgres', password: 'postgres', database: 'postgres' },
  { host: 'localhost', port: 5432, user: 'Administrator', password: '', database: 'postgres' },
  { host: 'localhost', port: 5432, user: 'Administrator', password: 'password', database: 'postgres' },
];

async function testConnection(config) {
  const client = new Client(config);
  try {
    await client.connect();
    console.log(`✅ Connected successfully with: user=${config.user}, password=${config.password || '(empty)'}`);
    
    // Try to create our database
    try {
      await client.query('CREATE DATABASE knowledge_sharing_db');
      console.log('✅ Database knowledge_sharing_db created');
    } catch (err) {
      if (err.code === '42P04') {
        console.log('✅ Database knowledge_sharing_db already exists');
      } else {
        console.log('⚠️  Could not create database:', err.message);
      }
    }
    
    await client.end();
    return true;
  } catch (error) {
    console.log(`❌ Failed with: user=${config.user}, password=${config.password || '(empty)'} - ${error.message}`);
    await client.end().catch(() => {});
    return false;
  }
}

async function main() {
  console.log('Testing PostgreSQL connections...\n');
  
  for (const config of testConnections) {
    const success = await testConnection(config);
    if (success) {
      console.log(`\n✅ Working connection found!`);
      console.log(`DATABASE_URL=postgresql://${config.user}:${config.password || ''}@localhost:5432/knowledge_sharing_db?schema=public`);
      process.exit(0);
    }
  }
  
  console.log('\n❌ No working connection found');
  process.exit(1);
}

main().catch(console.error);
