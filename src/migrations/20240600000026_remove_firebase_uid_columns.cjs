module.exports = {
    async up(queryInterface, Sequelize) {
        // Primero eliminar las restricciones de clave foránea
        await queryInterface.removeConstraint('groups', 'groups_owner_firebase_uid_fkey');
        await queryInterface.removeConstraint('group_members', 'group_members_firebase_uid_fkey');

        // Eliminar los índices si existen
        await queryInterface.removeIndex('groups', 'groups_owner_firebase_uid');
        await queryInterface.removeIndex('group_members', 'group_members_firebase_uid');

        // Eliminar las columnas
        await queryInterface.removeColumn('groups', 'owner_firebase_uid');
        await queryInterface.removeColumn('group_members', 'firebase_uid');
    },

    async down(queryInterface, Sequelize) {
        // Restaurar las columnas
        await queryInterface.addColumn('groups', 'owner_firebase_uid', {
            type: Sequelize.STRING,
            allowNull: false,
            references: {
                model: 'users',
                key: 'firebase_uid'
            }
        });

        await queryInterface.addColumn('group_members', 'firebase_uid', {
            type: Sequelize.STRING,
            allowNull: false,
            references: {
                model: 'users',
                key: 'firebase_uid'
            }
        });

        // Restaurar los índices
        await queryInterface.addIndex('groups', ['owner_firebase_uid'], {
            name: 'groups_owner_firebase_uid'
        });

        await queryInterface.addIndex('group_members', ['firebase_uid'], {
            name: 'group_members_firebase_uid'
        });
    }
}; 