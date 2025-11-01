const { MongoClient } = require('mongodb');

async function checkSubcliente() {
  const uri = 'mongodb://admin:assetflow2025secure@localhost:27017/assetflow?authSource=admin';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('assetflow');
    const clientes = db.collection('clientes');

    console.log('🔍 Buscando todos los clientes...\n');
    const allClientes = await clientes.find({}).toArray();

    allClientes.forEach((cliente, index) => {
      console.log(`\n${index + 1}. ${cliente.codigo}: ${cliente.nombre}`);
      console.log(`   _id: ${cliente._id}`);
      console.log(`   CIF: ${cliente.cif}`);
      console.log(`   esSubcliente: ${cliente.esSubcliente}`);
      console.log(`   clientePrincipal: ${cliente.clientePrincipal || 'null'}`);
      console.log(`   activo: ${cliente.activo}`);
    });

    console.log('\n' + '='.repeat(60));
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

checkSubcliente();
