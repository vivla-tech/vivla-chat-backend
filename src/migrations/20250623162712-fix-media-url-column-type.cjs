'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Cambiar el tipo de columna de VARCHAR(255) a TEXT para permitir URLs más largas
    await queryInterface.changeColumn('messages', 'media_url', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    // Revertir a STRING (VARCHAR(255))
    await queryInterface.changeColumn('messages', 'media_url', {
      type: Sequelize.STRING,
      allowNull: true
    });
  }
};
