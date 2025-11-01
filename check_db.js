require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const Cliente = require('./backend/src/models/Cliente');

async function checkDB() {
  try {
    const mongoUri = process.env.MONGODB_URI.replace('@mongodb:', '@localhost:');
    console.log('Conectando a:', mongoUri.replace(/\/\/.*@/, '//****@'));
    await mongoose.connect(mongoUri);
    console.log('Conectado!\n');

    // Verificar cuántos clientes hay
    const totalClientes = await Cliente.countDocuments();
    console.log(`Total de clientes en la base de datos: ${totalClientes}\n`);

    if (totalClientes > 0) {
      const clientes = await Cliente.find().limit(10);
      console.log('Clientes encontrados:');
      clientes.forEach(c => {
        console.log(`- ${c.codigo}: ${c.nombre}`);
      });
    } else {
      console.log('No hay clientes en la base de datos');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

checkDB();
