module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn('invited_guests', 'magic_token', {
            type: Sequelize.TEXT,
            allowNull: false,
            unique: true
        });
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn('invited_guests', 'magic_token', {
            type: Sequelize.STRING(255),
            allowNull: false,
            unique: true
        });
    }
}; 