module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('invited_guests', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            email: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
            },
            magic_token: {
                type: Sequelize.STRING(255),
                allowNull: false,
                unique: true
            },
            status: {
                type: Sequelize.ENUM('pending', 'accepted', 'rejected'),
                defaultValue: 'pending',
                allowNull: false
            },
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('invited_guests');
    }
}; 