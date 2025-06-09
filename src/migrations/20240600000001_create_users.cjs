module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('users', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal('gen_random_uuid()'),
                primaryKey: true,
                allowNull: false
            },
            firebase_uid: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false
            },
            email: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
            },
            house_name: {
                type: Sequelize.STRING,
                allowNull: true
            },
            cw_source_id: {
                type: Sequelize.INTEGER,
                allowNull: true
            },
            cw_contact_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                unique: true
            },
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            last_activity: {
                type: Sequelize.DATE,
                allowNull: true
            }
        });

        // Añadimos índices para mejorar el rendimiento
        await queryInterface.addIndex('users', ['email']);
        await queryInterface.addIndex('users', ['firebase_uid']);
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('users');
    }
}; 