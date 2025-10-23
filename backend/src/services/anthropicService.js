/**
 * AssetFlow 3.0 - Anthropic Service
 * Servicio para interactuar con la API de Anthropic (Claude)
 */

const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errorHandler');

/**
 * Llama a la API de Anthropic (Claude) con la configuración proporcionada
 * @param {Object} config - Configuración de AI (debe incluir apiKey desencriptada)
 * @param {Array} messages - Array de mensajes en formato Anthropic [{role, content}]
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>} {respuesta, tokensUsados, modelo}
 */
const callAnthropic = async (config, messages, options = {}) => {
  try {
    // Validar configuración
    if (!config || !config.apiKey) {
      throw new AppError('Configuración de Anthropic inválida o API key no proporcionada', 500);
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new AppError('Debe proporcionar al menos un mensaje', 400);
    }

    // Inicializar cliente de Anthropic
    const anthropic = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.apiUrl || undefined // Usa default si no se especifica
    });

    // Extraer system message si existe (Claude maneja system separado)
    let systemMessage = '';
    const claudeMessages = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemMessage = msg.content;
      } else {
        claudeMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    // Preparar parámetros de la llamada
    const params = {
      model: config.modelo || 'claude-3-5-sonnet-20241022',
      max_tokens: options.maxTokens || config.maxTokens || 2000,
      temperature: options.temperatura !== undefined ? options.temperatura : (config.temperatura || 0.7),
      messages: claudeMessages
    };

    // Agregar system message si existe
    if (systemMessage) {
      params.system = systemMessage;
    }

    // Opciones adicionales
    if (options.topP !== undefined) {
      params.top_p = options.topP;
    }

    if (options.topK !== undefined) {
      params.top_k = options.topK;
    }

    if (options.stopSequences && options.stopSequences.length > 0) {
      params.stop_sequences = options.stopSequences;
    }

    logger.info('Llamando a Anthropic API', {
      modelo: params.model,
      maxTokens: params.max_tokens,
      temperatura: params.temperature,
      numMensajes: claudeMessages.length,
      tieneSystem: !!systemMessage
    });

    // Realizar llamada a Anthropic
    const startTime = Date.now();
    const completion = await anthropic.messages.create(params);
    const endTime = Date.now();
    const tiempoRespuesta = endTime - startTime;

    // Extraer respuesta
    let respuesta = '';
    if (completion.content && completion.content.length > 0) {
      respuesta = completion.content[0].text;
    }

    const tokensUsados = (completion.usage?.input_tokens || 0) + (completion.usage?.output_tokens || 0);
    const promptTokens = completion.usage?.input_tokens || 0;
    const completionTokens = completion.usage?.output_tokens || 0;
    const stopReason = completion.stop_reason;

    logger.info('Respuesta de Anthropic recibida', {
      tokensUsados,
      promptTokens,
      completionTokens,
      stopReason,
      tiempoRespuesta: `${tiempoRespuesta}ms`
    });

    return {
      respuesta,
      tokensUsados,
      promptTokens,
      completionTokens,
      modelo: params.model,
      tiempoRespuesta,
      stopReason
    };

  } catch (error) {
    logger.error('Error al llamar a Anthropic API', {
      error: error.message,
      stack: error.stack,
      status: error.status,
      type: error.type
    });

    // Manejar errores específicos de Anthropic
    if (error.status === 401) {
      throw new AppError('API key de Anthropic inválida o expirada', 401);
    } else if (error.status === 429) {
      throw new AppError('Límite de rate de Anthropic excedido. Por favor intente más tarde', 429);
    } else if (error.status === 400) {
      throw new AppError(`Error en la solicitud a Anthropic: ${error.message}`, 400);
    } else if (error.status === 500 || error.status === 503) {
      throw new AppError('Servicio de Anthropic no disponible temporalmente', 503);
    } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      throw new AppError('No se pudo conectar con el servicio de Anthropic', 503);
    }

    throw new AppError(`Error al comunicarse con Anthropic: ${error.message}`, 500);
  }
};

/**
 * Llama a Anthropic para análisis de datos con contexto estructurado
 * @param {Object} config - Configuración de AI
 * @param {String} prompt - Prompt principal
 * @param {Object} context - Contexto de datos del sistema
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>} Resultado del análisis
 */
const analyzeWithAnthropic = async (config, prompt, context = {}, options = {}) => {
  try {
    // Construir mensaje del sistema con instrucciones
    const systemMessage = {
      role: 'system',
      content: `Eres un asistente experto en análisis de datos para AssetFlow 3.0, un sistema de gestión de inventario depositado en emplazamientos de clientes.

Tu función es:
- Analizar datos de depósitos, valoraciones, alertas y tendencias
- Generar insights accionables y recomendaciones profundas
- Identificar riesgos y oportunidades con razonamiento detallado
- Proporcionar respuestas claras, concisas y en español
- Formatear números como moneda europea (€) cuando sea apropiado
- Priorizar insights de alto impacto
- Aplicar pensamiento crítico y análisis profundo

Contexto del sistema:
${JSON.stringify(context, null, 2)}

Responde siempre en español y de forma profesional. Utiliza tu capacidad de razonamiento profundo para proporcionar análisis valiosos.`
    };

    const userMessage = {
      role: 'user',
      content: prompt
    };

    const messages = [systemMessage, userMessage];

    return await callAnthropic(config, messages, options);

  } catch (error) {
    throw error;
  }
};

/**
 * Genera un chat conversacional con Anthropic manteniendo historial
 * @param {Object} config - Configuración de AI
 * @param {Array} conversationHistory - Historial de conversación [{role, content}]
 * @param {String} newMessage - Nuevo mensaje del usuario
 * @param {Object} context - Contexto del sistema
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>} Respuesta del chat
 */
const chatWithAnthropic = async (config, conversationHistory = [], newMessage, context = {}, options = {}) => {
  try {
    // Mensaje del sistema con contexto
    const systemMessage = {
      role: 'system',
      content: `Eres un asistente de AssetFlow 3.0, un sistema de gestión de inventario depositado.

Puedes ayudar a los usuarios a:
- Consultar información sobre depósitos, clientes y emplazamientos
- Analizar datos y generar reportes detallados
- Responder preguntas sobre el estado del inventario
- Proporcionar recomendaciones basadas en datos con razonamiento profundo
- Explicar tendencias y patrones en los datos

Contexto actual del sistema:
${JSON.stringify(context, null, 2)}

Responde siempre en español de forma clara, amigable y con análisis profundo cuando sea apropiado.`
    };

    // Construir array de mensajes
    const messages = [systemMessage, ...conversationHistory, {
      role: 'user',
      content: newMessage
    }];

    return await callAnthropic(config, messages, options);

  } catch (error) {
    throw error;
  }
};

module.exports = {
  callAnthropic,
  analyzeWithAnthropic,
  chatWithAnthropic
};
