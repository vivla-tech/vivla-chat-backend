'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('messages', 'cw_message_id', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'ID externo del mensaje en Chatwoot'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('messages', 'cw_message_id');
  }
}; 