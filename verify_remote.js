const { MongoClient } = require('mongodb');

async function verifyRemoteData() {
  const remoteUri = 'mongodb://admin:assetflow2025secure@167.235.58.24:27017/assetflow?authSource=admin';
  const client = new MongoClient(remoteUri);

  try {
    console.log('🔄 Conectando al servidor remoto para verificación...\n');
    await client.connect();

    const db = client.db('assetflow');
    const clientes = db.collection('clientes');
    const emplazamientos = db.collection('emplazamientos');

    // Verificar cliente
    console.log('='.repeat(60));
    console.log('VERIFICACIÓN EN SERVIDOR REMOTO (167.235.58.24)');
    console.log('='.repeat(60));

    const cliente = await clientes.findOne({ codigo: 'CLI-00001' });
    console.log('\n📋 CLIENTE:');
    console.log(`   Código: ${cliente.codigo}`);
    console.log(`   Nombre: ${cliente.nombre}`);
    console.log(`   ID: ${cliente._id}\n`);

    // Contar emplazamientos
    const totalEmplazamientos = await emplazamientos.countDocuments({ cliente: cliente._id });
    console.log('📍 EMPLAZAMIENTOS:');
    console.log(`   Total: ${totalEmplazamientos}\n`);

    // Mostrar algunos ejemplos
    console.log('📋 Primeros 5 emplazamientos:');
    const ejemplos = await emplazamientos.find({ cliente: cliente._id }).limit(5).toArray();
    ejemplos.forEach(e => {
      console.log(`   - ${e.codigo}: ${e.nombre} (${e.direccion.ciudad})`);
    });

    // Verificar distribución por provincia
    console.log('\n📊 Distribución por provincia (top 10):');
    const porProvincia = await emplazamientos.aggregate([
      { $match: { cliente: cliente._id } },
      { $group: { _id: '$direccion.provincia', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    porProvincia.forEach(p => {
      console.log(`   ${p._id}: ${p.count} emplazamientos`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ VERIFICACIÓN COMPLETADA');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

verifyRemoteData();
