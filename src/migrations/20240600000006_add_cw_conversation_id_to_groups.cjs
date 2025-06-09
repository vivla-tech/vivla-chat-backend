'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('groups', 'cw_conversation_id', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Chatwoot conversation ID para el grupo'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('groups', 'cw_conversation_id');
  }
}; 