const { v4: uuidv4 } = require('uuid');

module.exports = {
    async up(queryInterface, Sequelize) {
        const vivlaUser = {
            id: uuidv4(),
            firebase_uid: '0000',
            name: 'VIVLA',
            email: 'cx@vivla.com',
            house_name: 'VIVLA',
            cw_source_id: uuidv4(),
            cw_contact_id: '0',
            created_at: new Date(),
            last_activity: new Date()
        };

        await queryInterface.bulkInsert('users', [vivlaUser], {});
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('users', {
            firebase_uid: '0000'
        }, {});
    }
}; 