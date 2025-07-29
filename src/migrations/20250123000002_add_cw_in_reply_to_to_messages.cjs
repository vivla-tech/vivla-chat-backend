'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('messages', 'cw_in_reply_to', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'ID del mensaje de Chatwoot al que responde este mensaje'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('messages', 'cw_in_reply_to');
  }
}; 