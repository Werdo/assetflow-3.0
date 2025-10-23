/**
 * AssetFlow 3.0 - OpenAI Service
 * Servicio para interactuar con la API de OpenAI (ChatGPT)
 */

const OpenAI = require('openai');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errorHandler');

/**
 * Llama a la API de OpenAI con la configuración proporcionada
 * @param {Object} config - Configuración de AI (debe incluir apiKey desencriptada)
 * @param {Array} messages - Array de mensajes en formato OpenAI [{role, content}]
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>} {respuesta, tokensUsados, modelo}
 */
const callOpenAI = async (config, messages, options = {}) => {
  try {
    // Validar configuración
    if (!config || !config.apiKey) {
      throw new AppError('Configuración de OpenAI inválida o API key no proporcionada', 500);
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new AppError('Debe proporcionar al menos un mensaje', 400);
    }

    // Inicializar cliente de OpenAI
    const openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.apiUrl || undefined // Usa default si no se especifica
    });

    // Preparar parámetros de la llamada
    const params = {
      model: config.modelo || 'gpt-4-turbo-preview',
      messages: messages,
      max_tokens: options.maxTokens || config.maxTokens || 2000,
      temperature: options.temperatura !== undefined ? options.temperatura : (config.temperatura || 0.7),
      top_p: options.topP || 1,
      frequency_penalty: options.frequencyPenalty || 0,
      presence_penalty: options.presencePenalty || 0
    };

    // Si se requiere respuesta en formato JSON
    if (options.responseFormat === 'json') {
      params.response_format = { type: 'json_object' };
    }

    // Si se proporcionan funciones (function calling)
    if (options.functions && options.functions.length > 0) {
      params.functions = options.functions;
      if (options.functionCall) {
        params.function_call = options.functionCall;
      }
    }

    // Si se proporcionan herramientas (tools)
    if (options.tools && options.tools.length > 0) {
      params.tools = options.tools;
      if (options.toolChoice) {
        params.tool_choice = options.toolChoice;
      }
    }

    logger.info('Llamando a OpenAI API', {
      modelo: params.model,
      maxTokens: params.max_tokens,
      temperatura: params.temperature,
      numMensajes: messages.length
    });

    // Realizar llamada a OpenAI
    const startTime = Date.now();
    const completion = await openai.chat.completions.create(params);
    const endTime = Date.now();
    const tiempoRespuesta = endTime - startTime;

    // Extraer respuesta
    const respuesta = completion.choices[0].message.content;
    const tokensUsados = completion.usage?.total_tokens || 0;
    const promptTokens = completion.usage?.prompt_tokens || 0;
    const completionTokens = completion.usage?.completion_tokens || 0;
    const finishReason = completion.choices[0].finish_reason;

    logger.info('Respuesta de OpenAI recibida', {
      tokensUsados,
      promptTokens,
      completionTokens,
      finishReason,
      tiempoRespuesta: `${tiempoRespuesta}ms`
    });

    // Verificar si hubo function call
    let functionCall = null;
    let toolCalls = null;
    if (completion.choices[0].message.function_call) {
      functionCall = completion.choices[0].message.function_call;
    }
    if (completion.choices[0].message.tool_calls) {
      toolCalls = completion.choices[0].message.tool_calls;
    }

    return {
      respuesta,
      tokensUsados,
      promptTokens,
      completionTokens,
      modelo: params.model,
      tiempoRespuesta,
      finishReason,
      functionCall,
      toolCalls
    };

  } catch (error) {
    logger.error('Error al llamar a OpenAI API', {
      error: error.message,
      stack: error.stack,
      status: error.status,
      type: error.type
    });

    // Manejar errores específicos de OpenAI
    if (error.status === 401) {
      throw new AppError('API key de OpenAI inválida o expirada', 401);
    } else if (error.status === 429) {
      throw new AppError('Límite de rate de OpenAI excedido. Por favor intente más tarde', 429);
    } else if (error.status === 400) {
      throw new AppError(`Error en la solicitud a OpenAI: ${error.message}`, 400);
    } else if (error.status === 500 || error.status === 503) {
      throw new AppError('Servicio de OpenAI no disponible temporalmente', 503);
    } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      throw new AppError('No se pudo conectar con el servicio de OpenAI', 503);
    }

    throw new AppError(`Error al comunicarse con OpenAI: ${error.message}`, 500);
  }
};

/**
 * Llama a OpenAI para análisis de datos con contexto estructurado
 * @param {Object} config - Configuración de AI
 * @param {String} prompt - Prompt principal
 * @param {Object} context - Contexto de datos del sistema
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>} Resultado del análisis
 */
const analyzeWithOpenAI = async (config, prompt, context = {}, options = {}) => {
  try {
    // Construir mensaje del sistema con instrucciones
    const systemMessage = {
      role: 'system',
      content: `Eres un asistente experto en análisis de datos para AssetFlow 3.0, un sistema de gestión de inventario depositado en emplazamientos de clientes.

Tu función es:
- Analizar datos de depósitos, valoraciones, alertas y tendencias
- Generar insights accionables y recomendaciones
- Identificar riesgos y oportunidades
- Proporcionar respuestas claras, concisas y en español
- Formatear números como moneda europea (€) cuando sea apropiado
- Priorizar insights de alto impacto

Contexto del sistema:
${JSON.stringify(context, null, 2)}

Responde siempre en español y de forma profesional.`
    };

    const userMessage = {
      role: 'user',
      content: prompt
    };

    const messages = [systemMessage, userMessage];

    return await callOpenAI(config, messages, options);

  } catch (error) {
    throw error;
  }
};

/**
 * Genera un chat conversacional con OpenAI manteniendo historial
 * @param {Object} config - Configuración de AI
 * @param {Array} conversationHistory - Historial de conversación [{role, content}]
 * @param {String} newMessage - Nuevo mensaje del usuario
 * @param {Object} context - Contexto del sistema
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>} Respuesta del chat
 */
const chatWithOpenAI = async (config, conversationHistory = [], newMessage, context = {}, options = {}) => {
  try {
    // Mensaje del sistema con contexto
    const systemMessage = {
      role: 'system',
      content: `Eres un asistente de AssetFlow 3.0, un sistema de gestión de inventario depositado.

Puedes ayudar a los usuarios a:
- Consultar información sobre depósitos, clientes y emplazamientos
- Analizar datos y generar reportes
- Responder preguntas sobre el estado del inventario
- Proporcionar recomendaciones basadas en datos

Contexto actual del sistema:
${JSON.stringify(context, null, 2)}

Responde siempre en español de forma clara y amigable.`
    };

    // Construir array de mensajes
    const messages = [systemMessage, ...conversationHistory, {
      role: 'user',
      content: newMessage
    }];

    return await callOpenAI(config, messages, options);

  } catch (error) {
    throw error;
  }
};

module.exports = {
  callOpenAI,
  analyzeWithOpenAI,
  chatWithOpenAI
};
