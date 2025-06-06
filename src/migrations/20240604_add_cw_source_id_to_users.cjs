'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'cw_source_id', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Chatwoot source ID para el usuario'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'cw_source_id');
  }
}; 