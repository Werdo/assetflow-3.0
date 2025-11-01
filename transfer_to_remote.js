const { MongoClient } = require('mongodb');
const fs = require('fs');

async function transferData() {
  // Conexión a MongoDB remoto
  const remoteUri = 'mongodb://admin:assetflow2025secure@167.235.58.24:27017/assetflow?authSource=admin';
  const remoteClient = new MongoClient(remoteUri);

  try {
    console.log('🔄 Conectando al servidor remoto (167.235.58.24)...');
    await remoteClient.connect();
    console.log('✅ Conectado al servidor remoto\n');

    const remoteDb = remoteClient.db('assetflow');
    const remoteClientes = remoteDb.collection('clientes');
    const remoteEmplazamientos = remoteDb.collection('emplazamientos');

    // Leer archivos JSON exportados
    console.log('📖 Leyendo archivos exportados...');
    const clienteData = JSON.parse(fs.readFileSync('./backup_transfer/cliente_omnitrade.json', 'utf8'));
    const emplazamientosData = fs.readFileSync('./backup_transfer/emplazamientos_omnitrade.json', 'utf8')
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));

    console.log(`✅ Cliente leído: ${clienteData.nombre}`);
    console.log(`✅ ${emplazamientosData.length} emplazamientos leídos\n`);

    // Verificar si el cliente ya existe en remoto
    console.log('🔍 Verificando si el cliente ya existe en remoto...');
    const existingCliente = await remoteClientes.findOne({ codigo: clienteData.codigo });

    if (existingCliente) {
      console.log(`⚠️  Cliente ${clienteData.codigo} ya existe en remoto (ID: ${existingCliente._id})`);
      console.log('   Usando el cliente existente para los emplazamientos\n');
      clienteData._id = existingCliente._id;
    } else {
      // Insertar cliente en remoto
      console.log('📤 Insertando cliente en servidor remoto...');
      delete clienteData._id; // Dejar que MongoDB genere nuevo ID
      const clienteResult = await remoteClientes.insertOne(clienteData);
      console.log(`✅ Cliente insertado con ID: ${clienteResult.insertedId}\n`);
      clienteData._id = clienteResult.insertedId;
    }

    // Verificar cuántos emplazamientos ya existen
    const existingEmplCount = await remoteEmplazamientos.countDocuments({
      codigo: { $regex: '^EMP-OMN-' }
    });
    console.log(`ℹ️  Emplazamientos existentes en remoto: ${existingEmplCount}\n`);

    // Insertar emplazamientos en lotes
    console.log('📤 Insertando emplazamientos en servidor remoto...');
    let insertados = 0;
    let saltados = 0;
    const batchSize = 100;

    for (let i = 0; i < emplazamientosData.length; i += batchSize) {
      const batch = emplazamientosData.slice(i, i + batchSize);

      for (const emp of batch) {
        try {
          // Verificar si ya existe
          const exists = await remoteEmplazamientos.findOne({ codigo: emp.codigo });
          if (exists) {
            saltados++;
            continue;
          }

          // Convertir cliente ObjectId
          if (typeof emp.cliente === 'object' && emp.cliente.$oid) {
            emp.cliente = clienteData._id;
          }

          // Convertir fechas
          if (emp.createdAt && emp.createdAt.$date) {
            emp.createdAt = new Date(emp.createdAt.$date);
          }
          if (emp.updatedAt && emp.updatedAt.$date) {
            emp.updatedAt = new Date(emp.updatedAt.$date);
          }

          // Eliminar _id para que MongoDB genere uno nuevo
          delete emp._id;

          await remoteEmplazamientos.insertOne(emp);
          insertados++;

          if (insertados % 100 === 0) {
            console.log(`   Progreso: ${insertados}/${emplazamientosData.length} emplazamientos insertados...`);
          }
        } catch (error) {
          console.error(`   Error insertando ${emp.codigo}: ${error.message}`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE TRANSFERENCIA');
    console.log('='.repeat(60));
    console.log(`Total procesados:          ${emplazamientosData.length}`);
    console.log(`✅ Insertados:             ${insertados}`);
    console.log(`⏭️  Saltados (ya existían): ${saltados}`);
    console.log('='.repeat(60) + '\n');

    // Verificar total final en remoto
    const finalCount = await remoteEmplazamientos.countDocuments({
      codigo: { $regex: '^EMP-OMN-' }
    });
    console.log(`ℹ️  Total de emplazamientos Omnitrade en remoto: ${finalCount}\n`);

  } catch (error) {
    console.error('❌ Error en la transferencia:', error);
  } finally {
    await remoteClient.close();
    console.log('👋 Conexión cerrada');
  }
}

transferData();
