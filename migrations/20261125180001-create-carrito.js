'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('carrito', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },
        usuarioid: {
            allowNull: false,
            type: Sequelize.UUID,
            references: {
            model: 'usuario',
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
            onDelete: 'CASCADE'
        },
        cantidad: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 1
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

        await queryInterface.addIndex('carrito', ['usuarioid', 'productoid'], {
        unique: true,
        name: 'carrito_usuario_producto_unique'
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('carrito');
    }
};