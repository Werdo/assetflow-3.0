const Deposito = require('../models/Deposito');
const Emplazamiento = require('../models/Emplazamiento');
const Cliente = require('../models/Cliente');
const Producto = require('../models/Producto');
const XLSX = require('xlsx');
const { stringify } = require('csv-stringify/sync');
const { parse } = require('csv-parse/sync');

/**
 * Exportar depósitos a CSV
 */
exports.exportDepositosCSV = async (req, res) => {
  try {
    const { clienteId, subclienteId, emplazamientoId, productoId, estado } = req.query;

    // Construir filtro
    const filter = {};
    if (clienteId) filter.cliente = clienteId;
    if (subclienteId) filter.subcliente = subclienteId;
    if (emplazamientoId) filter.emplazamiento = emplazamientoId;
    if (productoId) filter.producto = productoId;
    if (estado) filter.estado = estado;

    // Obtener depósitos con referencias pobladas
    const depositos = await Deposito.find(filter)
      .populate('producto', 'nombre codigo')
      .populate('emplazamiento', 'nombre codigo')
      .populate('cliente', 'nombre codigo')
      .populate('subcliente', 'nombre codigo')
      .sort({ numeroDeposito: 1 })
      .lean();

    // Log para debugging
    console.log(`Exportando ${depositos.length} depósitos a CSV`);

    // Convertir a formato plano para CSV
    const data = depositos.map(dep => ({
      numeroDeposito: dep.numeroDeposito || '',
      productoNombre: dep.producto?.nombre || '',
      productoCodigo: dep.producto?.codigo || '',
      emplazamientoNombre: dep.emplazamiento?.nombre || '',
      emplazamientoCodigo: dep.emplazamiento?.codigo || '',
      clienteNombre: dep.cliente?.nombre || '',
      clienteCodigo: dep.cliente?.codigo || '',
      subclienteNombre: dep.subcliente?.nombre || '',
      subclienteCodigo: dep.subcliente?.codigo || '',
      cantidad: dep.cantidad || 0,
      fechaDeposito: dep.fechaDeposito ? new Date(dep.fechaDeposito).toISOString().split('T')[0] : '',
      fechaVencimiento: dep.fechaVencimiento ? new Date(dep.fechaVencimiento).toISOString().split('T')[0] : '',
      valorUnitario: dep.valorUnitario || 0,
      valorTotal: dep.valorTotal || 0,
      estado: dep.estado || 'activo',
      tieneTrazabilidad: dep.tieneTrazabilidad ? 'Si' : 'No',
      codigoLote: dep.codigoLote || '',
      tipoLote: dep.tipoLote || '',
      cantidadCodigos: dep.codigosUnitarios?.length || 0,
      observaciones: dep.observaciones || ''
    }));

    // Generar CSV
    const csv = stringify(data, {
      header: true,
      columns: [
        { key: 'numeroDeposito', header: 'Numero Deposito' },
        { key: 'productoNombre', header: 'Producto' },
        { key: 'productoCodigo', header: 'Codigo Producto' },
        { key: 'emplazamientoNombre', header: 'Emplazamiento' },
        { key: 'emplazamientoCodigo', header: 'Codigo Emplazamiento' },
        { key: 'clienteNombre', header: 'Cliente' },
        { key: 'clienteCodigo', header: 'Codigo Cliente' },
        { key: 'subclienteNombre', header: 'Subcliente' },
        { key: 'subclienteCodigo', header: 'Codigo Subcliente' },
        { key: 'cantidad', header: 'Cantidad' },
        { key: 'fechaDeposito', header: 'Fecha Deposito' },
        { key: 'fechaVencimiento', header: 'Fecha Vencimiento' },
        { key: 'valorUnitario', header: 'Valor Unitario' },
        { key: 'valorTotal', header: 'Valor Total' },
        { key: 'estado', header: 'Estado' },
        { key: 'tieneTrazabilidad', header: 'Tiene Trazabilidad' },
        { key: 'codigoLote', header: 'Codigo Lote' },
        { key: 'tipoLote', header: 'Tipo Lote' },
        { key: 'cantidadCodigos', header: 'Cantidad Codigos' },
        { key: 'observaciones', header: 'Observaciones' }
      ]
    });

    // Enviar respuesta
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=depositos_${Date.now()}.csv`);
    res.status(200).send(csv);

  } catch (error) {
    console.error('Error exporting depositos to CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Error al exportar depósitos a CSV',
      error: error.message
    });
  }
};

/**
 * Exportar depósitos a Excel
 */
exports.exportDepositosExcel = async (req, res) => {
  try {
    const { clienteId, subclienteId, emplazamientoId, productoId, estado } = req.query;

    // Construir filtro
    const filter = {};
    if (clienteId) filter.cliente = clienteId;
    if (subclienteId) filter.subcliente = subclienteId;
    if (emplazamientoId) filter.emplazamiento = emplazamientoId;
    if (productoId) filter.producto = productoId;
    if (estado) filter.estado = estado;

    // Obtener depósitos con referencias pobladas
    const depositos = await Deposito.find(filter)
      .populate('producto', 'nombre codigo')
      .populate('emplazamiento', 'nombre codigo')
      .populate('cliente', 'nombre codigo')
      .populate('subcliente', 'nombre codigo')
      .sort({ numeroDeposito: 1 })
      .lean();

    // Convertir a formato plano para Excel
    const data = depositos.map(dep => ({
      'Numero Deposito': dep.numeroDeposito || '',
      'Producto': dep.producto?.nombre || '',
      'Codigo Producto': dep.producto?.codigo || '',
      'Emplazamiento': dep.emplazamiento?.nombre || '',
      'Codigo Emplazamiento': dep.emplazamiento?.codigo || '',
      'Cliente': dep.cliente?.nombre || '',
      'Codigo Cliente': dep.cliente?.codigo || '',
      'Subcliente': dep.subcliente?.nombre || '',
      'Codigo Subcliente': dep.subcliente?.codigo || '',
      'Cantidad': dep.cantidad || 0,
      'Fecha Deposito': dep.fechaDeposito ? new Date(dep.fechaDeposito).toISOString().split('T')[0] : '',
      'Fecha Vencimiento': dep.fechaVencimiento ? new Date(dep.fechaVencimiento).toISOString().split('T')[0] : '',
      'Valor Unitario': dep.valorUnitario || 0,
      'Valor Total': dep.valorTotal || 0,
      'Estado': dep.estado || 'activo',
      'Tiene Trazabilidad': dep.tieneTrazabilidad ? 'Si' : 'No',
      'Codigo Lote': dep.codigoLote || '',
      'Tipo Lote': dep.tipoLote || '',
      'Cantidad Codigos': dep.codigosUnitarios?.length || 0,
      'Observaciones': dep.observaciones || ''
    }));

    // Crear workbook y worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 18 }, // Numero Deposito
      { wch: 25 }, // Producto
      { wch: 18 }, // Codigo Producto
      { wch: 30 }, // Emplazamiento
      { wch: 22 }, // Codigo Emplazamiento
      { wch: 25 }, // Cliente
      { wch: 15 }, // Codigo Cliente
      { wch: 25 }, // Subcliente
      { wch: 18 }, // Codigo Subcliente
      { wch: 10 }, // Cantidad
      { wch: 15 }, // Fecha Deposito
      { wch: 18 }, // Fecha Vencimiento
      { wch: 15 }, // Valor Unitario
      { wch: 15 }, // Valor Total
      { wch: 12 }, // Estado
      { wch: 18 }, // Tiene Trazabilidad
      { wch: 15 }, // Codigo Lote
      { wch: 12 }, // Tipo Lote
      { wch: 15 }, // Cantidad Codigos
      { wch: 40 }  // Observaciones
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Depositos');

    // Generar buffer de Excel
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Enviar respuesta
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=depositos_${Date.now()}.xlsx`);
    res.status(200).send(excelBuffer);

  } catch (error) {
    console.error('Error exporting depositos to Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Error al exportar depósitos a Excel',
      error: error.message
    });
  }
};

/**
 * Exportar emplazamientos a CSV
 */
exports.exportEmplazamientosCSV = async (req, res) => {
  try {
    const { clienteId, subclienteId, activo, tipoIcono } = req.query;

    // Construir filtro
    const filter = {};
    if (clienteId) filter.cliente = clienteId;
    if (subclienteId) filter.subcliente = subclienteId;
    if (activo !== undefined) filter.activo = activo === 'true';
    if (tipoIcono) filter.tipoIcono = tipoIcono;

    // Obtener emplazamientos con referencias pobladas
    const emplazamientos = await Emplazamiento.find(filter)
      .populate('cliente', 'nombre codigo')
      .populate('subcliente', 'nombre codigo')
      .sort({ codigo: 1 })
      .lean();

    // Convertir a formato plano para CSV
    const data = emplazamientos.map(emp => ({
      codigo: emp.codigo || '',
      nombre: emp.nombre || '',
      clienteNombre: emp.cliente?.nombre || '',
      clienteCodigo: emp.cliente?.codigo || '',
      subclienteNombre: emp.subcliente?.nombre || '',
      subclienteCodigo: emp.subcliente?.codigo || '',
      calle: emp.direccion?.calle || '',
      ciudad: emp.direccion?.ciudad || '',
      provincia: emp.direccion?.provincia || '',
      codigoPostal: emp.direccion?.codigoPostal || '',
      pais: emp.direccion?.pais || 'España',
      longitud: emp.coordenadas?.coordinates?.[0] || '',
      latitud: emp.coordenadas?.coordinates?.[1] || '',
      contactoNombre: emp.contacto?.nombre || '',
      contactoTelefono: emp.contacto?.telefono || '',
      contactoEmail: emp.contacto?.email || '',
      activo: emp.activo ? 'Si' : 'No',
      tipoIcono: emp.tipoIcono || 'circle',
      observaciones: emp.observaciones || ''
    }));

    // Generar CSV
    const csv = stringify(data, {
      header: true,
      columns: [
        { key: 'codigo', header: 'Codigo' },
        { key: 'nombre', header: 'Nombre' },
        { key: 'clienteNombre', header: 'Cliente' },
        { key: 'clienteCodigo', header: 'Codigo Cliente' },
        { key: 'subclienteNombre', header: 'Subcliente' },
        { key: 'subclienteCodigo', header: 'Codigo Subcliente' },
        { key: 'calle', header: 'Calle' },
        { key: 'ciudad', header: 'Ciudad' },
        { key: 'provincia', header: 'Provincia' },
        { key: 'codigoPostal', header: 'Codigo Postal' },
        { key: 'pais', header: 'Pais' },
        { key: 'longitud', header: 'Longitud' },
        { key: 'latitud', header: 'Latitud' },
        { key: 'contactoNombre', header: 'Contacto Nombre' },
        { key: 'contactoTelefono', header: 'Contacto Telefono' },
        { key: 'contactoEmail', header: 'Contacto Email' },
        { key: 'activo', header: 'Activo' },
        { key: 'tipoIcono', header: 'Tipo Icono' },
        { key: 'observaciones', header: 'Observaciones' }
      ]
    });

    // Enviar respuesta
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=emplazamientos_${Date.now()}.csv`);
    res.status(200).send(csv);

  } catch (error) {
    console.error('Error exporting emplazamientos to CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Error al exportar emplazamientos a CSV',
      error: error.message
    });
  }
};

/**
 * Exportar emplazamientos a Excel
 */
exports.exportEmplazamientosExcel = async (req, res) => {
  try {
    const { clienteId, subclienteId, activo, tipoIcono } = req.query;

    // Construir filtro
    const filter = {};
    if (clienteId) filter.cliente = clienteId;
    if (subclienteId) filter.subcliente = subclienteId;
    if (activo !== undefined) filter.activo = activo === 'true';
    if (tipoIcono) filter.tipoIcono = tipoIcono;

    // Obtener emplazamientos con referencias pobladas
    const emplazamientos = await Emplazamiento.find(filter)
      .populate('cliente', 'nombre codigo')
      .populate('subcliente', 'nombre codigo')
      .sort({ codigo: 1 })
      .lean();

    // Convertir a formato plano para Excel
    const data = emplazamientos.map(emp => ({
      'Codigo': emp.codigo || '',
      'Nombre': emp.nombre || '',
      'Cliente': emp.cliente?.nombre || '',
      'Codigo Cliente': emp.cliente?.codigo || '',
      'Subcliente': emp.subcliente?.nombre || '',
      'Codigo Subcliente': emp.subcliente?.codigo || '',
      'Calle': emp.direccion?.calle || '',
      'Ciudad': emp.direccion?.ciudad || '',
      'Provincia': emp.direccion?.provincia || '',
      'Codigo Postal': emp.direccion?.codigoPostal || '',
      'Pais': emp.direccion?.pais || 'España',
      'Longitud': emp.coordenadas?.coordinates?.[0] || '',
      'Latitud': emp.coordenadas?.coordinates?.[1] || '',
      'Contacto Nombre': emp.contacto?.nombre || '',
      'Contacto Telefono': emp.contacto?.telefono || '',
      'Contacto Email': emp.contacto?.email || '',
      'Activo': emp.activo ? 'Si' : 'No',
      'Tipo Icono': emp.tipoIcono || 'circle',
      'Observaciones': emp.observaciones || ''
    }));

    // Crear workbook y worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 18 }, // Codigo
      { wch: 30 }, // Nombre
      { wch: 25 }, // Cliente
      { wch: 15 }, // Codigo Cliente
      { wch: 25 }, // Subcliente
      { wch: 18 }, // Codigo Subcliente
      { wch: 35 }, // Calle
      { wch: 20 }, // Ciudad
      { wch: 20 }, // Provincia
      { wch: 12 }, // Codigo Postal
      { wch: 10 }, // Pais
      { wch: 12 }, // Longitud
      { wch: 12 }, // Latitud
      { wch: 20 }, // Contacto Nombre
      { wch: 15 }, // Contacto Telefono
      { wch: 25 }, // Contacto Email
      { wch: 8 },  // Activo
      { wch: 12 }, // Tipo Icono
      { wch: 40 }  // Observaciones
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Emplazamientos');

    // Generar buffer de Excel
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Enviar respuesta
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=emplazamientos_${Date.now()}.xlsx`);
    res.status(200).send(excelBuffer);

  } catch (error) {
    console.error('Error exporting emplazamientos to Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Error al exportar emplazamientos a Excel',
      error: error.message
    });
  }
};

/**
 * Importar depósitos desde CSV/Excel
 */
exports.importDepositos = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha proporcionado archivo'
      });
    }

    let data = [];
    const fileBuffer = req.file.buffer;
    const mimeType = req.file.mimetype;

    // Parsear según el tipo de archivo
    if (mimeType === 'text/csv' || mimeType === 'application/csv') {
      // Parsear CSV
      const csvContent = fileBuffer.toString('utf-8');
      data = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
               mimeType === 'application/vnd.ms-excel') {
      // Parsear Excel
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Formato de archivo no soportado. Use CSV o Excel'
      });
    }

    // Validar y preparar datos para importación
    const results = {
      total: data.length,
      created: 0,
      updated: 0,
      errors: []
    };

    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i];

        // Buscar producto por código
        const producto = await Producto.findOne({ codigo: row['Codigo Producto'] || row.productoCodigo });
        if (!producto) {
          results.errors.push({ row: i + 1, error: 'Producto no encontrado', codigo: row['Codigo Producto'] || row.productoCodigo });
          continue;
        }

        // Buscar emplazamiento por código
        const emplazamiento = await Emplazamiento.findOne({ codigo: row['Codigo Emplazamiento'] || row.emplazamientoCodigo });
        if (!emplazamiento) {
          results.errors.push({ row: i + 1, error: 'Emplazamiento no encontrado', codigo: row['Codigo Emplazamiento'] || row.emplazamientoCodigo });
          continue;
        }

        // Buscar cliente por código
        const cliente = await Cliente.findOne({ codigo: row['Codigo Cliente'] || row.clienteCodigo });
        if (!cliente) {
          results.errors.push({ row: i + 1, error: 'Cliente no encontrado', codigo: row['Codigo Cliente'] || row.clienteCodigo });
          continue;
        }

        // Buscar subcliente si existe
        let subcliente = null;
        const subclienteCodigo = row['Codigo Subcliente'] || row.subclienteCodigo;
        if (subclienteCodigo) {
          subcliente = await Cliente.findOne({ codigo: subclienteCodigo });
        }

        // Preparar datos del depósito
        const depositoData = {
          producto: producto._id,
          emplazamiento: emplazamiento._id,
          cliente: cliente._id,
          subcliente: subcliente?._id || null,
          cantidad: parseInt(row.Cantidad || row.cantidad) || 0,
          fechaDeposito: row['Fecha Deposito'] || row.fechaDeposito ? new Date(row['Fecha Deposito'] || row.fechaDeposito) : new Date(),
          fechaVencimiento: row['Fecha Vencimiento'] || row.fechaVencimiento ? new Date(row['Fecha Vencimiento'] || row.fechaVencimiento) : null,
          valorUnitario: parseFloat(row['Valor Unitario'] || row.valorUnitario) || 0,
          valorTotal: parseFloat(row['Valor Total'] || row.valorTotal) || 0,
          estado: row.Estado || row.estado || 'activo',
          tieneTrazabilidad: (row['Tiene Trazabilidad'] || row.tieneTrazabilidad) === 'Si',
          codigoLote: row['Codigo Lote'] || row.codigoLote || '',
          tipoLote: row['Tipo Lote'] || row.tipoLote || '',
          observaciones: row.Observaciones || row.observaciones || ''
        };

        // Buscar si existe el depósito por numero
        const numeroDeposito = row['Numero Deposito'] || row.numeroDeposito;
        if (numeroDeposito) {
          const existingDeposito = await Deposito.findOne({ numeroDeposito });
          if (existingDeposito) {
            // Actualizar
            await Deposito.findByIdAndUpdate(existingDeposito._id, depositoData);
            results.updated++;
          } else {
            // Crear nuevo con número específico
            depositoData.numeroDeposito = numeroDeposito;
            await Deposito.create(depositoData);
            results.created++;
          }
        } else {
          // Crear nuevo (se generará número automáticamente)
          await Deposito.create(depositoData);
          results.created++;
        }

      } catch (error) {
        results.errors.push({ row: i + 1, error: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Importación completada',
      results
    });

  } catch (error) {
    console.error('Error importing depositos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al importar depósitos',
      error: error.message
    });
  }
};

/**
 * Importar emplazamientos desde CSV/Excel
 */
exports.importEmplazamientos = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha proporcionado archivo'
      });
    }

    let data = [];
    const fileBuffer = req.file.buffer;
    const mimeType = req.file.mimetype;

    // Parsear según el tipo de archivo
    if (mimeType === 'text/csv' || mimeType === 'application/csv') {
      const csvContent = fileBuffer.toString('utf-8');
      data = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
               mimeType === 'application/vnd.ms-excel') {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Formato de archivo no soportado. Use CSV o Excel'
      });
    }

    // Validar y preparar datos para importación
    const results = {
      total: data.length,
      created: 0,
      updated: 0,
      errors: []
    };

    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i];

        // Buscar cliente por código
        const cliente = await Cliente.findOne({ codigo: row['Codigo Cliente'] || row.clienteCodigo });
        if (!cliente) {
          results.errors.push({ row: i + 1, error: 'Cliente no encontrado', codigo: row['Codigo Cliente'] || row.clienteCodigo });
          continue;
        }

        // Buscar subcliente si existe
        let subcliente = null;
        const subclienteCodigo = row['Codigo Subcliente'] || row.subclienteCodigo;
        if (subclienteCodigo) {
          subcliente = await Cliente.findOne({ codigo: subclienteCodigo });
        }

        // Preparar datos del emplazamiento
        const emplazamientoData = {
          nombre: row.Nombre || row.nombre,
          cliente: cliente._id,
          subcliente: subcliente?._id || null,
          direccion: {
            calle: row.Calle || row.calle || '',
            ciudad: row.Ciudad || row.ciudad || '',
            provincia: row.Provincia || row.provincia || '',
            codigoPostal: row['Codigo Postal'] || row.codigoPostal || '',
            pais: row.Pais || row.pais || 'España'
          },
          coordenadas: {
            type: 'Point',
            coordinates: [
              parseFloat(row.Longitud || row.longitud) || 0,
              parseFloat(row.Latitud || row.latitud) || 0
            ]
          },
          contacto: {
            nombre: row['Contacto Nombre'] || row.contactoNombre || '',
            telefono: row['Contacto Telefono'] || row.contactoTelefono || '',
            email: row['Contacto Email'] || row.contactoEmail || ''
          },
          activo: (row.Activo || row.activo) !== 'No',
          tipoIcono: row['Tipo Icono'] || row.tipoIcono || 'circle',
          observaciones: row.Observaciones || row.observaciones || ''
        };

        // Buscar si existe el emplazamiento por código
        const codigo = row.Codigo || row.codigo;
        if (codigo) {
          const existingEmplazamiento = await Emplazamiento.findOne({ codigo });
          if (existingEmplazamiento) {
            // Actualizar (no actualizar código)
            await Emplazamiento.findByIdAndUpdate(existingEmplazamiento._id, emplazamientoData);
            results.updated++;
          } else {
            // Crear nuevo con código específico
            emplazamientoData.codigo = codigo;
            await Emplazamiento.create(emplazamientoData);
            results.created++;
          }
        } else {
          // Crear nuevo (se generará código automáticamente)
          await Emplazamiento.create(emplazamientoData);
          results.created++;
        }

      } catch (error) {
        results.errors.push({ row: i + 1, error: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Importación completada',
      results
    });

  } catch (error) {
    console.error('Error importing emplazamientos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al importar emplazamientos',
      error: error.message
    });
  }
};

/**
 * Actualización masiva de depósitos
 */
exports.updateDepositosBulk = async (req, res) => {
  try {
    const { depositoIds, updates } = req.body;

    if (!depositoIds || !Array.isArray(depositoIds) || depositoIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de IDs de depósitos'
      });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Se requieren los datos de actualización'
      });
    }

    // Realizar actualización masiva
    const result = await Deposito.updateMany(
      { _id: { $in: depositoIds } },
      { $set: updates }
    );

    res.status(200).json({
      success: true,
      message: 'Depósitos actualizados correctamente',
      modified: result.modifiedCount
    });

  } catch (error) {
    console.error('Error bulk updating depositos:', error);
    res.status(500).json({
      success: false,
      message: 'Error en actualización masiva de depósitos',
      error: error.message
    });
  }
};
