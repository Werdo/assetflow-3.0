const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

// Admin credentials
const loginData = {
  email: 'ppelaez@oversunenergy.com',
  password: 'bb474edf'
};

let authToken = '';

async function login() {
  try {
    console.log('🔐 Iniciando sesión...');
    const response = await axios.post(`${API_URL}/auth/login`, loginData);
    authToken = response.data.data.token;
    console.log('✅ Sesión iniciada correctamente\n');
    return authToken;
  } catch (error) {
    console.error('❌ Error al iniciar sesión:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function getCliente(codigo) {
  try {
    console.log(`📋 Buscando cliente ${codigo}...`);
    const response = await axios.get(`${API_URL}/clientes`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { search: codigo, limit: 1 }
    });

    if (response.data.data.clientes.length === 0) {
      console.log(`⚠️  Cliente ${codigo} no encontrado`);
      return null;
    }

    const cliente = response.data.data.clientes[0];
    console.log(`✅ Cliente encontrado: ${cliente.nombre} (${cliente.codigo})`);
    console.log(`   ID: ${cliente._id}\n`);
    return cliente;
  } catch (error) {
    console.error('❌ Error al buscar cliente:', error.response?.data || error.message);
    return null;
  }
}

async function createSubcliente(clientePrincipalId) {
  try {
    console.log('📝 Creando subcliente...');

    const subclienteData = {
      nombre: 'Subcliente Test - División Norte',
      cif: 'B99887766',
      direccion: {
        calle: 'Calle Secundaria 123',
        ciudad: 'Madrid',
        provincia: 'Madrid',
        codigoPostal: '28001',
        pais: 'España'
      },
      contacto: {
        nombre: 'Juan Pérez',
        telefono: '912345678',
        email: 'juan.perez@subclientetest.com'
      },
      esSubcliente: true,
      clientePrincipal: clientePrincipalId,
      observaciones: 'Subcliente de prueba creado automáticamente'
    };

    const response = await axios.post(`${API_URL}/clientes`, subclienteData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const subcliente = response.data.data.cliente;
    console.log('✅ Subcliente creado exitosamente!');
    console.log(`   Código: ${subcliente.codigo}`);
    console.log(`   Nombre: ${subcliente.nombre}`);
    console.log(`   CIF: ${subcliente.cif}`);
    console.log(`   ID: ${subcliente._id}`);
    console.log(`   Es Subcliente: ${subcliente.esSubcliente}`);
    console.log(`   Cliente Principal: ${subcliente.clientePrincipal}\n`);

    return subcliente;
  } catch (error) {
    console.error('❌ Error al crear subcliente:');
    console.error('   Mensaje:', error.response?.data?.message || error.message);
    if (error.response?.data?.error) {
      console.error('   Detalles:', error.response.data.error);
    }
    return null;
  }
}

async function getClienteDetalle(clienteId) {
  try {
    console.log('📊 Obteniendo detalles del cliente principal...');
    const response = await axios.get(`${API_URL}/clientes/${clienteId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const data = response.data.data;
    console.log(`✅ Detalles obtenidos:`);
    console.log(`   Cliente: ${data.cliente.nombre}`);
    console.log(`   Subclientes: ${data.subclientes.length}`);

    if (data.subclientes.length > 0) {
      console.log('\n   📋 Lista de subclientes:');
      data.subclientes.forEach((sub, index) => {
        console.log(`      ${index + 1}. ${sub.codigo}: ${sub.nombre}`);
      });
    }
    console.log('');

    return data;
  } catch (error) {
    console.error('❌ Error al obtener detalles:', error.response?.data || error.message);
    return null;
  }
}

async function createClientePrincipal() {
  try {
    console.log('📝 Creando cliente principal de prueba...');

    const clienteData = {
      nombre: 'Cliente Test Principal SA',
      cif: 'A12345678',
      direccion: {
        calle: 'Calle Principal 456',
        ciudad: 'Madrid',
        provincia: 'Madrid',
        codigoPostal: '28002',
        pais: 'España'
      },
      contacto: {
        nombre: 'Ana García',
        telefono: '918765432',
        email: 'ana.garcia@clientetest.com'
      },
      observaciones: 'Cliente principal de prueba'
    };

    const response = await axios.post(`${API_URL}/clientes`, clienteData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const cliente = response.data.data.cliente;
    console.log('✅ Cliente principal creado exitosamente!');
    console.log(`   Código: ${cliente.codigo}`);
    console.log(`   Nombre: ${cliente.nombre}`);
    console.log(`   ID: ${cliente._id}\n`);

    return cliente;
  } catch (error) {
    console.error('❌ Error al crear cliente principal:');
    console.error('   Mensaje:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testSubclientes() {
  console.log('='.repeat(60));
  console.log('🧪 TEST: FUNCIONALIDAD DE SUBCLIENTES');
  console.log('='.repeat(60));
  console.log('');

  // 1. Login
  await login();

  // 2. Buscar cliente principal (Omnitrade) o crear uno nuevo
  let clientePrincipal = await getCliente('CLI-00001');
  if (!clientePrincipal) {
    console.log('ℹ️  Cliente CLI-00001 no encontrado. Creando cliente de prueba...\n');
    clientePrincipal = await createClientePrincipal();
    if (!clientePrincipal) {
      console.log('❌ No se pudo crear el cliente principal. Abortando test.');
      process.exit(1);
    }
  }

  // 3. Crear subcliente
  const subcliente = await createSubcliente(clientePrincipal._id);
  if (!subcliente) {
    console.log('❌ No se pudo crear el subcliente. Abortando test.');
    process.exit(1);
  }

  // 4. Verificar que el código tiene el prefijo correcto
  if (subcliente.codigo.startsWith('SUB-CLI-')) {
    console.log('✅ VERIFICACIÓN: El código tiene el prefijo correcto (SUB-CLI-)');
  } else {
    console.log(`❌ VERIFICACIÓN FALLIDA: El código debería empezar con SUB-CLI-, pero es: ${subcliente.codigo}`);
  }

  // 5. Obtener detalles del cliente principal para ver los subclientes
  await getClienteDetalle(clientePrincipal._id);

  console.log('='.repeat(60));
  console.log('✅ TEST COMPLETADO');
  console.log('='.repeat(60));
}

// Ejecutar test
testSubclientes().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
