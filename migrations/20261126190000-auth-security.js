'use strict';

function columns(types) {
    return {
        correoVerificadoEn: types.DATE,
        authVersion: types.UUID,
        verificacionHash: types.STRING(64),
        verificacionVence: types.DATE,
        recuperacionHash: types.STRING(64),
        recuperacionVence: types.DATE,
        mfaSecreto: types.STRING,
        mfaPendiente: types.STRING,
        mfaPendienteVence: types.DATE,
        mfaUltimoPaso: types.INTEGER,
        mfaRecuperacion: types.JSON,
        mfaRetoHash: types.STRING(64),
        mfaRetoVence: types.DATE,
        mfaRetoIntentos: types.INTEGER
    }
}

module.exports = {
    async up(queryInterface, Sequelize) {
        const current = await queryInterface.describeTable('usuario')
        for (const [name, type] of Object.entries(columns(Sequelize))) {
            if (!current[name]) {
                await queryInterface.addColumn('usuario', name, { type, allowNull: true })
            }
        }
        const indexes = await queryInterface.showIndex('usuario')
        for (const field of ['verificacionHash', 'recuperacionHash', 'mfaRetoHash']) {
            const name = 'usuario_' + field
            if (!indexes.some(index => index.name === name)) {
                await queryInterface.addIndex('usuario', [field], { name, unique: true })
            }
        }
    },
    async down(queryInterface, Sequelize) {
        const indexes = await queryInterface.showIndex('usuario')
        for (const field of ['verificacionHash', 'recuperacionHash', 'mfaRetoHash']) {
            const name = 'usuario_' + field
            if (indexes.some(index => index.name === name)) await queryInterface.removeIndex('usuario', name)
        }
        const current = await queryInterface.describeTable('usuario')
        for (const name of Object.keys(columns(Sequelize)).reverse()) {
            if (current[name]) await queryInterface.removeColumn('usuario', name)
        }
    }
}
