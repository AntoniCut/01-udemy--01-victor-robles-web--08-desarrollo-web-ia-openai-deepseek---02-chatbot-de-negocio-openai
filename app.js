/*
    *  ----------------------------------  *
    *  -----  /app.js  --  /app.js  -----  *
    *  ----------------------------------  *
*/


import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';


/*
    * ----------------------------------------------------------
    * -----  Servidor Express para chatbots usando OpenAI  -----
    * ----------------------------------------------------------
    * - Sirve frontend estático.
    * - Expone endpoint POST /api/chatbot.
    * - Interactúa con un modelo de OpenAI para generar respuestas.
    * --------------------------------------------------------------
*/


/*
    *  -----------------------------  *
    *  -----  Configuraciones  -----  *
    *  -----------------------------  *  
*/


/**  -----  Configuracion de variables de entorno con dotenv  ----- */
dotenv.config();

/** -----  `Ruta absoluta del archivo actual`  ----- */
const currentFilePath = fileURLToPath(import.meta.url);

/** -----  `Ruta absoluta del directorio actual`  ----- */
const currentDirPath = path.dirname(currentFilePath);

/** -----  `Ruta absoluta del frontend estatico`  ----- */
const publicDirPath = path.join(currentDirPath, 'public');

/**   -----  `Inicializacion de la aplicacion Express`  ----- */
const app = express();

/**  -----  `Puerto del servidor`  ----- */
const PORT = process.env.PORT || 3000;

/** -----  `Ruta base del proyecto`  ----- */
const base = '/02-chatbot-de-negocio-openai';


/** -----  `Inicialización del cliente de OpenAI`  ----- */
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});



/*
    *  -------------------------  *
    *  -----  Middlewares  -----  *
    *  -------------------------  *
*/


//*  -----  Servir archivos estaticos desde la carpeta 'public'  -----
app.use(base, express.static(publicDirPath));

//*  -----  Middleware para parsear JSON -----
app.use(express.json());

//*  -----  Middleware para parsear datos URL-encoded -----
app.use(express.urlencoded({ extended: true }));



/*
    *  ----------------------------------  *
    *  -----  Funciones de negocio  -----  *
    *  ----------------------------------  *
*/


/**
 * --------------------------------------
 * -----  `buildBusinessContext()`  -----
 * --------------------------------------
 * - `Construye el contexto de negocio para el modelo`
 * - `Devuelve el contexto de negocio para el modelo`
 * @returns {string} - El contexto de negocio para el modelo
 */

const buildBusinessContext = () => {

    return `
        - Eres un asistente de soporte para el supermercado "El PicoEsquina".
        - Información del negocio:
            - Ubicación: Calle Principal 123, Murcia, España.
            - Horario: Lunes a Sábado de 9:00 a 21:00, Domingo de 10:00 a 18:00.
            - Contacto: +34 123 456 789.
            - Productos: Frutas, Verduras, Carnes, Lacteos, Panaderia, Bebidas, Limpieza, Higiene Personal, Mascotas.
            - Marcas: Nestle, Coca-Cola, Danone, Unilever, Procter & Gamble, L'Oreal, Colgate-Palmolive, Heineken, PepsiCo, Mondelez.
        - Metodo de pago: Efectivo, Tarjeta de credito/debito, Transferencia bancaria, Bizum.
        - Solo puedes responder preguntas sobre la tienda. Cualquier otra pregunta esta prohibida.
    `;

}



/**
 * ------------------------------------------
 * -----  `getMessageFromRequest(req)`  -----
 * ------------------------------------------
 * - `Obtiene y normaliza el mensaje del usuario`
 * @param {express.Request} req - La solicitud HTTP de Express que contiene el mensaje del usuario en el cuerpo
 * @returns {string} - El mensaje del usuario normalizado
 */

const getMessageFromRequest = (req) => {

    /** @type {ChatbotRequestBody} - `Cuerpo de la solicitud del chatbot` */
    const body = req.body;

    //  -----  Retorna el mensaje del usuario normalizado o una cadena vacía si no es válido  -----
    return body?.message?.trim() || '';

}



/**
 * ---------------------------------------------
 * -----  `validateMessage(message, res)`  -----
 * ---------------------------------------------
 * - `Valida el mensaje del usuario y responde 400 si no es válido`
 * @param {string} message - El mensaje del usuario a validar
 * @param {express.Response} res - La respuesta HTTP de Express para enviar errores si el mensaje no es válido
 * @returns {boolean} - `true` si el mensaje es válido, `false` en caso contrario
 */

const validateMessage = (message, res) => {

    //  -----  Validacion basica del mensaje del usuario (no vacio)  -----
    if (message)
        return true;

    //  -----  Responde con error 400 si el mensaje no es valido  -----
    res.status(400).json({
        error: 'Has mandado un mensaje vacio. La pregunta del usuario es requerida!!'
    });

    //  -----  Retorna false para indicar que el mensaje no es valido  -----
    return false;

}



/**
 * ----------------------------------------------------------
 * -----  `generateChatbotReply(context, userMessage)`  -----
 * ----------------------------------------------------------
 * @async
 * - `Genera una respuesta del chatbot usando el modelo de OpenAI`
 * -  Ejecuta la llamada al modelo (placeholder modular).
 * @param {string} context - El contexto de negocio para el modelo
 * @param {string} userMessage - El mensaje del usuario para el chatbot
 * @returns {Promise<string>} - La respuesta generada por el chatbot
 * @throws {Error} - Si ocurre un error durante la generación de la respuesta
 */

const generateChatbotReply = async (context, userMessage) => {

    /** -----  `respuesta del modelo openai`  ----- */
    const response = await openai.chat.completions.create({

        //  -----  `Modelo de OpenAI a usar para el chatbot`  -----
        model: 'gpt-3.5-turbo',

        //  -----  `prompts para guiar la respuesta del chatbot`  -----
        messages: [

            {
                role: 'user',
                content: `${context}\nResponde de forma corta y directa, usando los minimos tokens posibles.`
            },

            {
                role: 'user',
                content: userMessage
            }
        ],

        //  -----  `Limite de tokens para la respuesta del chatbot`  -----
        max_tokens: 200,

    });


    /**  -----  `respuesta del chatbot`  ----- */
    const reply = response?.choices?.[0]?.message?.content?.trim();

    //  -----  Fallback seguro por si el modelo no devuelve texto util  -----
    return reply || 'No pude generar una respuesta ahora mismo.';

}



/**
 * ----------------------------------------------
 * -----  `handleChatbotError(error, res)`  -----
 * ----------------------------------------------
 * - `Maneja errores de API del endpoint`
 * @param {unknown} error - Error ocurrido durante la generación de la respuesta del chatbot
 * @param {express.Response} res - La respuesta HTTP de Express
 */

const handleChatbotError = (error, res) => {

    console.error('Error al generar respuesta del chatbot:', error);

    //  -----  Responde con error 500 si ocurre un error durante la generación de la respuesta del chatbot  -----
    return res.status(500).json({
        error: 'Error al generar respuesta del chatbot.'
    });

}



/*  
    *  -----------------------------------------  *
    *  -----  Endpoint POST /api/chatbot  -----  *
    *  -----------------------------------------  *
*/


/**
 * ----------------------------------------------  
 * -----  `handleChatbotRequest(req, res)`  -----  
 * ----------------------------------------------  
 * - `Maneja la solicitud del chatbot: valida, genera respuesta y maneja errores`
 * @async
 * @param {express.Request} req - La solicitud HTTP de Express
 * @param {express.Response} res - La respuesta HTTP de Express
 * @returns {Promise<void>} - No retorna valor; solo envía la respuesta HTTP
 */

const handleChatbotRequest = async (req, res) => {

    /** -----`contexto de negocio` */
    const context = buildBusinessContext();

    /** -----`mensaje del usuario` */
    const message = getMessageFromRequest(req);

    //  -----  Validacion del mensaje del usuario  -----
    if (!validateMessage(message, res))
        return;


    //  -----  Generacion de la respuesta del chatbot y manejo de errores  -----
    try {

        /**  -----  `respuesta del chatbot`  ----- */
        const reply = await generateChatbotReply(context, message);

        //  -----  Responde con la respuesta generada por el chatbot  -----
        res.json({
            success: true,
            message: reply
        });

    }

    //  -----  Manejo de errores durante la generación de la respuesta del chatbot  -----
    catch (error) {

        handleChatbotError(error, res);
    }

}



//*  -----  Endpoint POST /api/chatbot que maneja la solicitud del chatbot usando la funcion handleChatbotRequest  -----
app.post(`${base}/api/chatbot`, handleChatbotRequest);




/*
    *  ---------------------------------------------------------------  *
    *  -----  Inicia el servidor HTTP en el puerto especificado  -----  * 
    *  -----  y muestra un mensaje en consola                    -----  *
    *  ---------------------------------------------------------------  *
*/

app.listen(PORT, () => {
    console.log(`✅ Servidor escuchando en http://localhost:${PORT}${base} ✅`);
});
