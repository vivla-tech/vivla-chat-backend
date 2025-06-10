import { Server } from 'socket.io';

// Estado global del servicio WebSocket
let io = null;
// Mapa para mantener registro de usuarios conectados
// La clave es el userId y el valor es el socketId
const connectedUsers = new Map();

/**
 * Inicializa el servidor WebSocket
 * @param {Object} server - El servidor HTTP de Express
 * @returns {Object} La instancia del servidor Socket.IO
 */
export function initializeWebSocket(server) {
    // Creamos una nueva instancia de Socket.IO
    io = new Server(server, {
        cors: {
            // Permitimos conexiones desde el frontend
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            methods: ['GET', 'POST']
        }
    });

    // Manejamos la conexión de nuevos clientes
    io.on('connection', handleConnection);

    return io;
}

/**
 * Maneja la conexión de un nuevo cliente
 * @param {Object} socket - El objeto socket del cliente conectado
 */
function handleConnection(socket) {
    console.log('Usuario conectado:', socket.id);

    // Cuando un usuario se autentica
    socket.on('authenticate', (userId) => {
        // Guardamos la relación entre userId y socketId
        connectedUsers.set(userId, socket.id);
        console.log(`Usuario autenticado: ${userId}`);
    });

    // Cuando llega un mensaje de chat
    socket.on('chat_message', (data) => {
        const { groupId, userId, message } = data;
        console.log('Mensaje recibido en backend:', { groupId, userId, message });

        // Enviamos el mensaje a todos los usuarios en el mismo grupo
        const roomName = `group_${groupId}`;
        console.log('Enviando mensaje a sala:', roomName);
        console.log('Usuarios en la sala:', io.sockets.adapter.rooms.get(roomName)?.size || 0);

        io.to(roomName).emit('new_message', {
            groupId,
            userId,
            message,
            timestamp: new Date()
        });
    });

    // Cuando un usuario quiere unirse a un grupo
    socket.on('join_group', (groupId) => {
        const roomName = `group_${groupId}`;
        socket.join(roomName);
        console.log(`Socket ${socket.id} se unió al grupo ${groupId}`);
        console.log('Usuarios en la sala:', io.sockets.adapter.rooms.get(roomName)?.size || 0);
    });

    // Cuando un usuario quiere salir de un grupo
    socket.on('leave_group', (groupId) => {
        // El socket abandona la sala del grupo
        socket.leave(`group_${groupId}`);
        console.log(`Socket ${socket.id} salió del grupo ${groupId}`);
    });

    // Cuando un usuario se desconecta
    socket.on('disconnect', () => {
        // Buscamos y eliminamos al usuario desconectado de nuestro registro
        for (const [userId, socketId] of connectedUsers.entries()) {
            if (socketId === socket.id) {
                connectedUsers.delete(userId);
                console.log(`Usuario desconectado: ${userId}`);
                break;
            }
        }
    });
}

/**
 * Envía un mensaje a todos los usuarios de un grupo
 * @param {string|number} groupId - ID del grupo
 * @param {string} event - Nombre del evento
 * @param {Object} data - Datos a enviar
 */
export function emitToGroup(groupId, event, data) {
    if (io) {
        // Enviamos el evento a todos los sockets en la sala del grupo
        io.to(`group_${groupId}`).emit(event, data);
    }
}

/**
 * Envía un mensaje a un usuario específico
 * @param {string} userId - ID del usuario
 * @param {string} event - Nombre del evento
 * @param {Object} data - Datos a enviar
 */
export function emitToUser(userId, event, data) {
    if (io) {
        // Buscamos el socketId del usuario
        const socketId = connectedUsers.get(userId);
        if (socketId) {
            // Enviamos el evento solo a ese socket
            io.to(socketId).emit(event, data);
        }
    }
}

// Exportamos las funciones que necesitaremos usar en otros archivos
export const websocketService = {
    initialize: initializeWebSocket,
    emitToGroup,
    emitToUser
}; 