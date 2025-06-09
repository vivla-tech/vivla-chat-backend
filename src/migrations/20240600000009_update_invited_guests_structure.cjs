module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Primero renombramos id a guest_id
        await queryInterface.renameColumn('invited_guests', 'id', 'guest_id');

        // Añadimos las columnas faltantes
        await queryInterface.addColumn('invited_guests', 'name', {
            type: Sequelize.STRING,
            allowNull: true
        });

        await queryInterface.addColumn('invited_guests', 'associated_group_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'groups',
                key: 'group_id'
            },
            onDelete: 'SET NULL'
        });

        // Renombramos updated_at a last_seen_at
        await queryInterface.renameColumn('invited_guests', 'updated_at', 'last_seen_at');

        // Añadimos un índice para associated_group_id
        await queryInterface.addIndex('invited_guests', ['associated_group_id']);
    },

    down: async (queryInterface, Sequelize) => {
        // Eliminamos el índice
        await queryInterface.removeIndex('invited_guests', ['associated_group_id']);

        // Renombramos last_seen_at de vuelta a updated_at
        await queryInterface.renameColumn('invited_guests', 'last_seen_at', 'updated_at');

        // Eliminamos las columnas añadidas
        await queryInterface.removeColumn('invited_guests', 'associated_group_id');
        await queryInterface.removeColumn('invited_guests', 'name');

        // Renombramos guest_id de vuelta a id
        await queryInterface.renameColumn('invited_guests', 'guest_id', 'id');
    }
}; 