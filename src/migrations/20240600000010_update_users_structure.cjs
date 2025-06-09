module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Primero añadimos la columna id
        await queryInterface.addColumn('users', 'id', {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
            first: true // Esto coloca la columna al principio de la tabla
        });

        // Añadimos las columnas faltantes
        await queryInterface.addColumn('users', 'house_name', {
            type: Sequelize.STRING,
            allowNull: true
        });

        // Renombramos updated_at a last_activity si existe
        try {
            await queryInterface.renameColumn('users', 'updated_at', 'last_activity');
        } catch (error) {
            // Si updated_at no existe, creamos last_activity
            await queryInterface.addColumn('users', 'last_activity', {
                type: Sequelize.DATE,
                allowNull: true
            });
        }

        // Eliminamos columnas que no necesitamos
        const columnsToRemove = [
            'phone_number',
            'avatar_url',
            'status',
            'last_login_at',
            'last_active_at'
        ];

        for (const column of columnsToRemove) {
            try {
                await queryInterface.removeColumn('users', column);
            } catch (error) {
                // Ignoramos errores si la columna no existe
            }
        }

        // Añadimos índices para mejorar el rendimiento
        await queryInterface.addIndex('users', ['email']);
        await queryInterface.addIndex('users', ['firebase_uid']);
    },

    down: async (queryInterface, Sequelize) => {
        // Eliminamos los índices
        await queryInterface.removeIndex('users', ['email']);
        await queryInterface.removeIndex('users', ['firebase_uid']);

        // Eliminamos las columnas añadidas
        await queryInterface.removeColumn('users', 'last_activity');
        await queryInterface.removeColumn('users', 'house_name');
        await queryInterface.removeColumn('users', 'id');
    }
}; 