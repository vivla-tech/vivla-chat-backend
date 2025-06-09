module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Primero verificamos el tipo actual de la columna
        const tableInfo = await queryInterface.describeTable('users');
        console.log('Current users.id column type:', tableInfo.id.type);

        // Si no es UUID, la cambiamos
        if (tableInfo.id.type !== 'UUID') {
            console.log('Changing users.id column type to UUID...');
            
            // Primero eliminamos cualquier restricción que pueda existir
            try {
                await queryInterface.sequelize.query(
                    `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_pkey";`
                );
                console.log('Removed primary key constraint');
            } catch (error) {
                console.log('Could not remove primary key:', error.message);
            }

            // Cambiamos el tipo de la columna a UUID
            await queryInterface.sequelize.query(
                `ALTER TABLE "users" ALTER COLUMN "id" TYPE UUID USING id::UUID;`
            );
            console.log('Changed column type to UUID');

            // Recreamos la primary key
            await queryInterface.sequelize.query(
                `ALTER TABLE "users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");`
            );
            console.log('Recreated primary key constraint');

            // Añadimos el valor por defecto UUIDV4
            await queryInterface.sequelize.query(
                `ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();`
            );
            console.log('Added UUIDV4 default value');
        } else {
            console.log('users.id column is already UUID type');
        }
    },

    down: async (queryInterface, Sequelize) => {
        // No implementamos down ya que esta migración es de verificación
        console.log('This migration cannot be reverted as it is a verification migration');
    }
}; 