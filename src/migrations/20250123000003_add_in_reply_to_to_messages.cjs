'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('messages', 'in_reply_to', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'messages',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'UUID del mensaje al que responde este mensaje'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('messages', 'in_reply_to');
  }
}; 