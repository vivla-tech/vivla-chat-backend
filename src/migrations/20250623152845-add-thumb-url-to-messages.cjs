'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('messages', 'thumb_url', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'URL de la imagen thumbnail para mensajes de tipo media'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('messages', 'thumb_url');
  }
};
