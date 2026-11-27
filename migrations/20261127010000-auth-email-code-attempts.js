'use strict'

const fields = ['verificacionIntentos', 'recuperacionIntentos']

module.exports = {
    async up(queryInterface, Sequelize) {
        const columns = await queryInterface.describeTable('usuario')
        for (const field of fields) {
            if (!columns[field]) {
                await queryInterface.addColumn('usuario', field, { type: Sequelize.INTEGER, allowNull: true })
            }
        }
    },
    async down(queryInterface) {
        const columns = await queryInterface.describeTable('usuario')
        for (const field of fields) {
            if (columns[field]) await queryInterface.removeColumn('usuario', field)
        }
    }
}
