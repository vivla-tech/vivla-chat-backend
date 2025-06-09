module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('SequelizeMeta', {
            name: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
                primaryKey: true
            }
        });
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('SequelizeMeta');
    }
}; 