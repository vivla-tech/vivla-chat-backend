'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'cw_contact_id', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Chatwoot contact ID para el usuario'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'cw_contact_id');
  }
}; 