/**
 * Script para limpiar completamente la base de datos
 * ADVERTENCIA: Este script elimina TODOS los datos de prueba
 * Mantiene solo el usuario administrador principal
 */

const mongoose = require('mongoose');
const path = require('path');

// Intentar cargar .env desde el directorio correcto (parent de scripts)
// Esto funciona en desarrollo, pero en Docker las vars ya están cargadas
const envPath = path.resolve(__dirname, '..', '.env');
try {
  require('dotenv').config({ path: envPath });
} catch (error) {
  // Si falla (ej: en Docker), las vars de entorno ya deberían estar disponibles
  console.log('ℹ️  Usando variables de entorno del sistema (Docker)');
}

const cleanDatabase = async () => {
  try {
    // Verificar que tenemos la URI de MongoDB
    const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!MONGO_URI) {
      console.error('❌ ERROR: MONGO_URI no está definida en las variables de entorno');
      console.log('💡 Variables de entorno disponibles:', Object.keys(process.env).filter(k => k.includes('MONGO')));
      process.exit(1);
    }

    console.log('🚀 Iniciando limpieza de base de datos...');
    console.log(`📍 Conectando a: ${MONGO_URI.replace(/mongodb:\/\/([^:]+):([^@]+)@/, 'mongodb://***:***@')}`);

    // Conectar a MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Obtener todas las colecciones
    const collections = await mongoose.connection.db.collections();

    console.log('📊 Colecciones encontradas:');
    collections.forEach(col => console.log(`   - ${col.collectionName}`));
    console.log('');

    // Estadísticas antes de limpiar
    console.log('📈 Conteo ANTES de limpieza:');
    for (const collection of collections) {
      const count = await collection.countDocuments();
      console.log(`   ${collection.collectionName}: ${count} documentos`);
    }
    console.log('');

    // Confirmar antes de proceder
    console.log('⚠️  ADVERTENCIA: Esta operación es IRREVERSIBLE');
    console.log('⚠️  Se eliminarán TODOS los datos de la base de datos');
    console.log('');

    // En producción, agregar una pausa para confirmar manualmente
    // Por ahora procedemos directamente
    console.log('🗑️  Procediendo con la limpieza...\n');

    let totalDeleted = 0;

    // Limpiar cada colección
    for (const collection of collections) {
      const collectionName = collection.collectionName;

      // Determinar qué eliminar según la colección
      let deleteResult;

      if (collectionName === 'users') {
        // En users, mantener solo el usuario admin principal (por email)
        const adminEmail = process.env.ADMIN_EMAIL || 'ppelaez@oversunenergy.com';
        deleteResult = await collection.deleteMany({
          email: { $ne: adminEmail }
        });
        console.log(`   ✓ ${collectionName}: ${deleteResult.deletedCount} documentos eliminados (admin preservado)`);
      } else {
        // Todas las demás colecciones: eliminar todo
        deleteResult = await collection.deleteMany({});
        console.log(`   ✓ ${collectionName}: ${deleteResult.deletedCount} documentos eliminados`);
      }

      totalDeleted += deleteResult.deletedCount;
    }

    console.log('');
    console.log(`✅ Limpieza completada: ${totalDeleted} documentos eliminados en total\n`);

    // Estadísticas después de limpiar
    console.log('📊 Conteo DESPUÉS de limpieza:');
    for (const collection of collections) {
      const count = await collection.countDocuments();
      console.log(`   ${collection.collectionName}: ${count} documentos`);
    }
    console.log('');

    // Verificar que el admin sigue existente
    const User = require('../src/models/User');
    const adminCount = await User.countDocuments();
    if (adminCount > 0) {
      const admin = await User.findOne().select('name email role');
      console.log('👤 Usuario administrador preservado:');
      console.log(`   - Name: ${admin.name}`);
      console.log(`   - Email: ${admin.email}`);
      console.log(`   - Role: ${admin.role}`);
    } else {
      console.log('⚠️  ADVERTENCIA: No hay usuarios en el sistema. Necesitarás crear un admin.');
    }

    console.log('');
    console.log('✨ Base de datos lista para datos de producción');
    console.log('');

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Desconectado de MongoDB');
    process.exit(0);
  }
};

// Ejecutar el script
cleanDatabase();
