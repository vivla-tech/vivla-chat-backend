'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('messages', 'file_name', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('messages', 'file_size', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await queryInterface.addColumn('messages', 'file_type', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('messages', 'file_name');
    await queryInterface.removeColumn('messages', 'file_size');
    await queryInterface.removeColumn('messages', 'file_type');
  }
};
