'use strict'

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.changeColumn('pedido', 'total', {
            type: Sequelize.DECIMAL(22, 2),
            allowNull: false
        })
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.changeColumn('pedido', 'total', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false
        })
    }
}
