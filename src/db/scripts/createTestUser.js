import { User } from '../models/index.js';

const createTestUser = async () => {
    try {
        const testUser = await User.create({
            firebase_uid: 'test-uid-123',
            name: 'Usuario de Prueba',
            email: 'test@example.com'
        });

        console.log('Usuario de prueba creado:', testUser.toJSON());
    } catch (error) {
        console.error('Error al crear el usuario de prueba:', error);
    } finally {
        process.exit();
    }
};

createTestUser(); 