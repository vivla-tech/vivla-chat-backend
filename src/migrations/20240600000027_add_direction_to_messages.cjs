'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Primero añadimos la columna como nullable
    await queryInterface.addColumn('messages', 'direction', {
      type: Sequelize.STRING,
      allowNull: true
    });

    // Actualizamos los registros existentes a 'incoming'
    await queryInterface.sequelize.query(
      `UPDATE messages SET direction = 'incoming' WHERE direction IS NULL`
    );

    // Ahora hacemos la columna no nullable
    await queryInterface.changeColumn('messages', 'direction', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'incoming'
    });

    // Añadimos un índice para mejorar el rendimiento de las búsquedas
    await queryInterface.addIndex('messages', ['direction'], {
      name: 'messages_direction_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    // Eliminamos el índice
    await queryInterface.removeIndex('messages', 'messages_direction_idx');
    
    // Eliminamos la columna
    await queryInterface.removeColumn('messages', 'direction');
  }
}; 