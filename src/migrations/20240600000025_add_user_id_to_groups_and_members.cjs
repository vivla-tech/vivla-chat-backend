module.exports = {
    async up(queryInterface, Sequelize) {
        // Añadir user_id a la tabla groups después de name
        await queryInterface.addColumn('groups', 'user_id', {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            after: 'name'
        });

        // Añadir user_id a la tabla group_members después de group_id
        await queryInterface.addColumn('group_members', 'user_id', {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            after: 'group_id'
        });
    },

    async down(queryInterface, Sequelize) {
        // Eliminar las columnas en orden inverso
        await queryInterface.removeColumn('group_members', 'user_id');
        await queryInterface.removeColumn('groups', 'user_id');
    }
}; 