require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const Cliente = require('./backend/src/models/Cliente');

async function createCliente() {
  try {
    const mongoUri = process.env.MONGODB_URI.replace('@mongodb:', '@localhost:');
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Conectado a MongoDB\n');

    // Verificar si ya existe el cliente
    const existente = await Cliente.findOne({ codigo: 'CLI-00001' });
    if (existente) {
      console.log('✅ El cliente Omnitrade ya existe:');
      console.log(`   Código: ${existente.codigo}`);
      console.log(`   Nombre: ${existente.nombre}`);
      console.log(`   ID: ${existente._id}\n`);
      return;
    }

    // Crear el cliente Omnitrade
    const cliente = await Cliente.create({
      codigo: 'CLI-00001',
      nombre: 'Omnitrade',
      razonSocial: 'Omnitrade S.L.',
      nif: 'B-12345678',
      direccion: {
        calle: 'Calle Principal 1',
        ciudad: 'Madrid',
        provincia: 'Madrid',
        codigoPostal: '28001',
        pais: 'España'
      },
      contacto: {
        nombre: 'Contacto Principal',
        telefono: '+34 900 000 000',
        email: 'contacto@omnitrade.es'
      },
      activo: true
    });

    console.log('✅ Cliente Omnitrade creado exitosamente:');
    console.log(`   Código: ${cliente.codigo}`);
    console.log(`   Nombre: ${cliente.nombre}`);
    console.log(`   ID: ${cliente._id}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Conexión cerrada');
  }
}

createCliente();
