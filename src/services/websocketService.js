import { Server } from 'socket.io';
import { User } from '../models/index.js';

// Estado global del servicio WebSocket
let io = null;
// Mapa para mantener registro de usuarios conectados
// La clave es el userId y el valor es el socketId
const connectedUsers = new Map();
const userGroups = new Map(); // userId -> Set<groupId>

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
    console.log('New WebSocket connection:', socket.id);

    // Cuando un usuario se autentica
    socket.on('authenticate', (userId, callback) => {
        try {
            if (!userId) {
                console.error('Error: userId no proporcionado en authenticate');
                callback?.({ success: false, error: 'userId no proporcionado' });
                return;
            }

            console.log('User authenticated:', { userId, socketId: socket.id });
            connectedUsers.set(String(userId), socket.id);
            callback?.({ success: true });
        } catch (error) {
            console.error('Error en authenticate:', error);
            callback?.({ success: false, error: error.message });
        }
    });

    // // Cuando llega un mensaje de chat
    // socket.on('chat_message', async (data, callback) => {
    //     try {
    //         const { groupId, userId, message } = data;
    //         if (!groupId || !userId || !message) {
    //             console.error('Error: datos incompletos en chat_message:', data);
    //             callback({ success: false, error: 'Datos incompletos' });
    //             return;
    //         }

    //         // Obtener el nombre del usuario
    //         const user = await User.findByPk(userId);
    //         if (!user) {
    //             throw new Error('Usuario no encontrado');
    //         }

    //         const groupIdStr = String(groupId);
    //         const roomName = `group_${groupIdStr}`;

    //         // Emitir el mensaje a la sala
    //         io.to(roomName).emit('chat_message', {
    //             groupId: groupIdStr,
    //             userId,
    //             message,
    //             sender_name: user.name,
    //             timestamp: new Date().toISOString()
    //         });

    //         callback({ success: true });
    //     } catch (error) {
    //         console.error('Error al procesar mensaje:', error);
    //         callback({ success: false, error: error.message });
    //     }
    // });

    // Cuando un usuario quiere unirse a un grupo
    socket.on('join_group', async (data, callback) => {
        try {
            const { groupId } = data;
            if (!groupId) {
                console.error('Error: groupId no proporcionado en join_group');
                callback({ success: false, error: 'groupId no proporcionado' });
                return;
            }

            const groupIdStr = String(groupId);
            const roomName = `group_${groupIdStr}`;

            console.log('Joining group:', {
                userId: Array.from(connectedUsers.entries()).find(([_, sid]) => sid === socket.id)?.[0],
                socketId: socket.id,
                groupId: groupIdStr,
                roomName,
                currentRooms: Array.from(socket.rooms)
            });

            // Verificar si el usuario ya está en la sala
            if (socket.rooms.has(roomName)) {
                console.log('User already in room:', roomName);
                callback({ success: true });
                return;
            }

            // Unir al socket a la sala
            await socket.join(roomName);
            console.log('User joined room:', {
                roomName,
                newRooms: Array.from(socket.rooms)
            });
            callback({ success: true });
        } catch (error) {
            console.error('Error al unir socket a grupo:', error);
            callback({ success: false, error: error.message });
        }
    });

    // Cuando un usuario quiere salir de un grupo
    socket.on('leave_group', (groupId) => {
        socket.leave(`group_${groupId}`);
    });

    // Cuando un usuario se desconecta
    socket.on('disconnect', () => {
        for (const [userId, socketId] of connectedUsers.entries()) {
            if (socketId === socket.id) {
                connectedUsers.delete(userId);
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
        const roomName = `group_${groupId}`;
        console.log('Emitting to group:', {
            roomName,
            event,
            data,
            connectedUsers: Array.from(connectedUsers.entries()),
            rooms: Array.from(io.sockets.adapter.rooms.keys())
        });

        // Enviamos el evento a todos los sockets en la sala del grupo
        io.to(roomName).emit(event, data);
    } else {
        console.error('WebSocket server not initialized');
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