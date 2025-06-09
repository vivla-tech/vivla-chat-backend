module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Primero eliminamos las referencias a esta columna en otras tablas si existen
        try {
            await queryInterface.removeConstraint('groups', 'groups_created_by_fkey');
        } catch (error) {
            console.log('Constraint might not exist, continuing...');
        }

        // Cambiamos el tipo de la columna id
        await queryInterface.changeColumn('users', 'id', {
            type: Sequelize.STRING,
            primaryKey: true,
            allowNull: false
        });

        // Volvemos a crear la referencia en groups si existía
        try {
            await queryInterface.addConstraint('groups', {
                fields: ['created_by'],
                type: 'foreign key',
                name: 'groups_created_by_fkey',
                references: {
                    table: 'users',
                    field: 'id'
                }
            });
        } catch (error) {
            console.log('Could not recreate foreign key, continuing...');
        }
    },

    down: async (queryInterface, Sequelize) => {
        // Primero eliminamos las referencias a esta columna en otras tablas si existen
        try {
            await queryInterface.removeConstraint('groups', 'groups_created_by_fkey');
        } catch (error) {
            console.log('Constraint might not exist, continuing...');
        }

        // Revertimos el tipo de la columna id
        await queryInterface.changeColumn('users', 'id', {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        });

        // Volvemos a crear la referencia en groups si existía
        try {
            await queryInterface.addConstraint('groups', {
                fields: ['created_by'],
                type: 'foreign key',
                name: 'groups_created_by_fkey',
                references: {
                    table: 'users',
                    field: 'id'
                }
            });
        } catch (error) {
            console.log('Could not recreate foreign key, continuing...');
        }
    }
}; 