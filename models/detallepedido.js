'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class detallepedido extends Model {
        static associate(models) {
        detallepedido.belongsTo(models.pedido, { foreignKey: 'pedidoid' });
        detallepedido.belongsTo(models.producto, { foreignKey: 'productoid' });
        }
    }

    detallepedido.init({
        id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
        },
        pedidoid: {
        type: DataTypes.INTEGER,
        allowNull: false
        },
        productoid: {
        type: DataTypes.INTEGER,
        allowNull: false
        },
        cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false
        },
        preciounitario: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
        }
    }, {
        sequelize,
        freezeTableName: true,
        modelName: 'detallepedido'
    });

    return detallepedido;
};