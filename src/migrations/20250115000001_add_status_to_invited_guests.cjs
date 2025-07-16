'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('invited_guests', 'status', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: 'pending' // Valor por defecto
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('invited_guests', 'status');
  }
}; 