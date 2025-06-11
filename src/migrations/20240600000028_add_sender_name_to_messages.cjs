'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Primero añadimos la columna como nullable
    await queryInterface.addColumn('messages', 'sender_name', {
      type: Sequelize.STRING,
      allowNull: true
    });

    // Actualizamos los registros existentes con el nombre del remitente
    await queryInterface.sequelize.query(`
      UPDATE messages m
      SET sender_name = u.name
      FROM users u
      WHERE m.sender_id = u.id
    `);

    // Ahora hacemos la columna no nullable
    await queryInterface.changeColumn('messages', 'sender_name', {
      type: Sequelize.STRING,
      allowNull: false
    });

    // Añadimos un índice para mejorar el rendimiento de las búsquedas
    await queryInterface.addIndex('messages', ['sender_name'], {
      name: 'messages_sender_name_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    // Eliminamos el índice
    await queryInterface.removeIndex('messages', 'messages_sender_name_idx');
    
    // Eliminamos la columna
    await queryInterface.removeColumn('messages', 'sender_name');
  }
}; 