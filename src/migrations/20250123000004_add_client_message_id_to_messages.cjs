'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('messages', 'client_message_id', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'ID de mensaje del cliente (string)'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('messages', 'client_message_id');
  }
};
