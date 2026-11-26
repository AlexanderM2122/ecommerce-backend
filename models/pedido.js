'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class pedido extends Model {
        static associate(models) {
        pedido.belongsTo(models.usuario, { foreignKey: 'usuarioid' });
        pedido.hasMany(models.detallepedido, { as: 'detalles', foreignKey: 'pedidoid' });
        }
    }

    pedido.init({
        id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
        },
        usuarioid: {
        type: DataTypes.UUID,
        allowNull: false
        },
        total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
        },
        estado: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'Completado'
        }
    }, {
        sequelize,
        freezeTableName: true,
        modelName: 'pedido'
    });

    return pedido;
};