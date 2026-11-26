'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class carrito extends Model {
        static associate(models) {
        carrito.belongsTo(models.usuario, { foreignKey: 'usuarioid' });
        carrito.belongsTo(models.producto, { foreignKey: 'productoid' });
        }
    }

    carrito.init({
        id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
        },
        usuarioid: {
        type: DataTypes.UUID,
        allowNull: false
        },
        productoid: {
        type: DataTypes.INTEGER,
        allowNull: false
        },
        cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
        }
    }, {
        sequelize,
        freezeTableName: true,
        modelName: 'carrito'
    });

    return carrito;
};