import axios from 'axios';
import FormData from 'form-data';
import path from 'path';

/**
 * Envía un mensaje con una imagen a una conversación de Chatwoot usando una URL de imagen.
 * @param {string} conversationId - El ID de la conversación en Chatwoot.
 * @param {string} firebaseImageUrl - La URL pública o firmada de la imagen en Firebase Storage.
 * @returns {Promise<object>} La respuesta de la API de Chatwoot.
 */
export async function sendFirebaseMediaLinkToChatwoot(conversationId, firebaseImageUrl) {

  // --- Variables de configuración (mueve esto a variables de entorno en un proyecto real) ---
  const chatwootAccountId = process.env.CHATWOOT_ACCOUNT_ID;
  const chatwootBaseUrl = process.env.CHATWOOT_BASE_URL;
  const apiAccessToken = process.env.CHATWOOT_ACCESS_TOKEN; // ¡Esto debe ser un secreto!

  const chatwootApiUrl = `${chatwootBaseUrl}/accounts/${chatwootAccountId}/conversations/${conversationId}/messages`;

  try {
    // -------------------------------------------------------------------
    // PASO 1: Descargar la imagen de Firebase Storage como un buffer
    // -------------------------------------------------------------------
    console.log(`🔍 Descargando imagen desde: ${firebaseImageUrl}`);
    console.log(`🔍 URL de Chatwoot: ${chatwootApiUrl}`);
    

    const imageResponse = await axios.get(firebaseImageUrl, {
      responseType: 'arraybuffer', // ¡Crucial! Obtener los datos como un buffer binario
      timeout: 30000, // 30 segundos de timeout
    });

    console.log(`✅ Imagen descargada exitosamente. Tamaño: ${imageResponse.data.length} bytes`);

    const imageBuffer = Buffer.from(imageResponse.data, 'binary');

    // Extraer un nombre de archivo de la URL para que Chatwoot lo reciba
    const filename = path.basename(new URL(firebaseImageUrl).pathname);
    console.log(`📁 Nombre del archivo: ${filename}`);

    // -------------------------------------------------------------------
    // PASO 2: Construir y enviar la petición multipart/form-data
    // -------------------------------------------------------------------
    const form = new FormData();

    // Adjuntamos el buffer como si fuera un archivo.
    // El tercer argumento (filename) es importante.
    form.append('attachments[]', imageBuffer, { filename });
    
    // Adjuntamos el resto de los campos del formulario
    form.append('content', '');
    form.append('message_type', 'incoming'); // O 'outgoing' si lo envía el agente
    // Chatwoot puede inferir el file_type, pero es bueno ser explícito
    // form.append('file_type', 'image'); 

    console.log('📤 Enviando imagen a Chatwoot...');
    console.log(`📤 Headers: ${JSON.stringify(form.getHeaders(), null, 2)}`);

    const response = await axios.post(chatwootApiUrl, form, {
      headers: {
        ...form.getHeaders(), // Esto añade el 'Content-Type: multipart/form-data; boundary=...' automáticamente
        'api_access_token': apiAccessToken,
      },
      timeout: 30000, // 30 segundos de timeout
    });

    console.log('✅ ¡Imagen enviada con éxito a Chatwoot!');
    console.log(`✅ Respuesta de Chatwoot: ${JSON.stringify(response.data, null, 2)}`);
    return response.data;

  } catch (error) {
    console.error('❌ Error al enviar la imagen a Chatwoot:');
    console.error(`❌ Tipo de error: ${error.name}`);
    console.error(`❌ Mensaje: ${error.message}`);
    
    if (error.response) {
      console.error(`❌ Status: ${error.response.status}`);
      console.error(`❌ Status Text: ${error.response.statusText}`);
      console.error(`❌ Response Data: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      console.error(`❌ Request error: ${error.request}`);
    }
    
    console.error(`❌ URL que falló: ${firebaseImageUrl}`);
    console.error(`❌ Chatwoot URL: ${chatwootApiUrl}`);
    
    throw new Error(`No se pudo completar la operación con Chatwoot: ${error.message}`);
  }
}