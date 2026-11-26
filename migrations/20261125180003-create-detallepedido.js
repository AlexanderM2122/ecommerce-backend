'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('detallepedido', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },
        pedidoid: {
            allowNull: false,
            type: Sequelize.INTEGER,
            references: {
            model: 'pedido',
            key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        productoid: {
            allowNull: false,
            type: Sequelize.INTEGER,
            references: {
            model: 'producto',
            key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT'
        },
        cantidad: {
            allowNull: false,
            type: Sequelize.INTEGER
        },
        preciounitario: {
            allowNull: false,
            type: Sequelize.DECIMAL(10, 2)
        },
        createdAt: {
            allowNull: false,
            type: Sequelize.DATE
        },
        updatedAt: {
            allowNull: false,
            type: Sequelize.DATE
        }
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('detallepedido');
    }
};