module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Primero añadir el campo status
        await queryInterface.addColumn('invited_guests', 'status', {
            type: Sequelize.ENUM('pending', 'accepted', 'expired'),
            allowNull: false,
            defaultValue: 'pending'
        });

        // Luego añadir el campo expires_at
        await queryInterface.addColumn('invited_guests', 'expires_at', {
            type: Sequelize.DATE,
            allowNull: true
        });

        // Actualizar las invitaciones existentes para que expiren en 24 horas desde su creación
        await queryInterface.sequelize.query(`
            UPDATE invited_guests 
            SET expires_at = created_at + INTERVAL '24 hours'
            WHERE expires_at IS NULL
        `);
    },

    down: async (queryInterface, Sequelize) => {
        // Eliminar el campo expires_at
        await queryInterface.removeColumn('invited_guests', 'expires_at');

        // Eliminar el enum status y su columna
        await queryInterface.removeColumn('invited_guests', 'status');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_invited_guests_status;');
    }
}; 