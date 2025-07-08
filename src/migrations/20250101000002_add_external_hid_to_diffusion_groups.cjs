'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('diffusion_groups', 'external_hid', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'ID externo de referencia a una casa'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('diffusion_groups', 'external_hid');
  }
}; 