'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add the tags column as JSONB with default empty array
    await queryInterface.addColumn('messages', 'tags', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: []
    });

    // Create GIN index for optimal performance on tag searches
    await queryInterface.addIndex('messages', {
      fields: ['tags'],
      using: 'GIN',
      name: 'idx_messages_tags_gin'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the index first
    await queryInterface.removeIndex('messages', 'idx_messages_tags_gin');
    
    // Remove the column
    await queryInterface.removeColumn('messages', 'tags');
  }
}; 