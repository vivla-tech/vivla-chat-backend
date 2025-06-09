module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Eliminar la tabla de migraciones
        console.log('Dropping SequelizeMeta table...');
        await queryInterface.sequelize.query(`
            DROP TABLE IF EXISTS "SequelizeMeta" CASCADE;
        `);

        // Crear la tabla de migraciones de nuevo
        console.log('Creating fresh SequelizeMeta table...');
        await queryInterface.createTable('SequelizeMeta', {
            name: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
                primaryKey: true
            }
        });

        // Insertar solo la última migración
        console.log('Inserting only the reset migration...');
        await queryInterface.sequelize.query(`
            INSERT INTO "SequelizeMeta" (name) VALUES ('20240600000017_reset_database.cjs');
        `);
    },

    down: async (queryInterface, Sequelize) => {
        // No implementamos down ya que esta migración es de limpieza
        console.log('This migration cannot be reverted as it is a cleanup migration');
    }
}; 