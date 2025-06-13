import { auth } from '../config/firebase.js';

export const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'No autorizado',
                details: 'Se requiere un token de autenticación'
            });
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await auth.verifyIdToken(token);

        // Añadir el usuario al objeto request
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email
        };

        next();
    } catch (error) {
        console.error('Error de autenticación:', error);
        return res.status(401).json({
            error: 'No autorizado',
            details: 'Token inválido o expirado'
        });
    }
}; 