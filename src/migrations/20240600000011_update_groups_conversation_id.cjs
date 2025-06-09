module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Primero eliminamos el índice único si existe
        try {
            await queryInterface.removeIndex('groups', 'groups_cw_conversation_id_key');
        } catch (error) {
            console.log('Index might not exist, continuing...');
        }

        // Cambiamos el tipo de la columna
        await queryInterface.changeColumn('groups', 'cw_conversation_id', {
            type: Sequelize.STRING,
            allowNull: true
        });

        // Volvemos a crear el índice único
        await queryInterface.addIndex('groups', ['cw_conversation_id'], {
            unique: true,
            name: 'groups_cw_conversation_id_key'
        });
    },

    down: async (queryInterface, Sequelize) => {
        // Primero eliminamos el índice único
        try {
            await queryInterface.removeIndex('groups', 'groups_cw_conversation_id_key');
        } catch (error) {
            console.log('Index might not exist, continuing...');
        }

        // Revertimos el tipo de la columna
        await queryInterface.changeColumn('groups', 'cw_conversation_id', {
            type: Sequelize.INTEGER,
            allowNull: true
        });

        // Volvemos a crear el índice único
        await queryInterface.addIndex('groups', ['cw_conversation_id'], {
            unique: true,
            name: 'groups_cw_conversation_id_key'
        });
    }
}; 