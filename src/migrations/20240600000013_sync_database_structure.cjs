module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Función auxiliar para verificar si una columna existe
        const columnExists = async (tableName, columnName) => {
            const tableInfo = await queryInterface.describeTable(tableName);
            return !!tableInfo[columnName];
        };

        // Función auxiliar para verificar el tipo de una columna
        const getColumnType = async (tableName, columnName) => {
            const tableInfo = await queryInterface.describeTable(tableName);
            return tableInfo[columnName]?.type;
        };

        // Función auxiliar para verificar si un índice existe
        const indexExists = async (tableName, indexName) => {
            try {
                const indexes = await queryInterface.showIndex(tableName);
                return indexes.some(index => index.name === indexName);
            } catch (error) {
                return false;
            }
        };

        // Actualizar tabla users
        const usersIdType = await getColumnType('users', 'id');
        if (usersIdType && usersIdType !== 'STRING') {
            console.log('Updating users.id column type to STRING...');
            await queryInterface.changeColumn('users', 'id', {
                type: Sequelize.STRING,
                primaryKey: true,
                allowNull: false
            });
        }

        // Actualizar tabla groups
        const groupsConversationIdType = await getColumnType('groups', 'cw_conversation_id');
        if (groupsConversationIdType && groupsConversationIdType !== 'STRING') {
            console.log('Updating groups.cw_conversation_id column type to STRING...');
            
            // Eliminar índice si existe
            const indexName = 'groups_cw_conversation_id_key';
            if (await indexExists('groups', indexName)) {
                console.log(`Removing index ${indexName}...`);
                await queryInterface.removeIndex('groups', indexName);
            }

            // Cambiar tipo de columna
            await queryInterface.changeColumn('groups', 'cw_conversation_id', {
                type: Sequelize.STRING,
                allowNull: true
            });

            // Recrear índice
            console.log(`Creating index ${indexName}...`);
            await queryInterface.addIndex('groups', ['cw_conversation_id'], {
                unique: true,
                name: indexName
            });
        }

        // Verificar y actualizar índices en users
        const usersIndices = ['users_email_key', 'users_firebase_uid_key'];
        for (const indexName of usersIndices) {
            if (!await indexExists('users', indexName)) {
                console.log(`Creating index ${indexName}...`);
                const column = indexName === 'users_email_key' ? 'email' : 'firebase_uid';
                await queryInterface.addIndex('users', [column], {
                    unique: true,
                    name: indexName
                });
            }
        }

        // Verificar y actualizar foreign keys
        const groupsCreatedByExists = await columnExists('groups', 'created_by');
        if (groupsCreatedByExists) {
            const fkName = 'groups_created_by_fkey';
            const fkExists = await indexExists('groups', fkName);
            
            if (!fkExists) {
                console.log(`Creating foreign key ${fkName}...`);
                try {
                    await queryInterface.addConstraint('groups', {
                        fields: ['created_by'],
                        type: 'foreign key',
                        name: fkName,
                        references: {
                            table: 'users',
                            field: 'id'
                        }
                    });
                } catch (error) {
                    console.log(`Could not create foreign key ${fkName}:`, error.message);
                }
            }
        }
    },

    down: async (queryInterface, Sequelize) => {
        // No implementamos down ya que esta migración es de sincronización
        // y no queremos revertir los cambios estructurales
        console.log('This migration cannot be reverted as it is a structural sync');
    }
}; 