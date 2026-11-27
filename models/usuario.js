'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class usuario extends Model {
    static associate(models) {
      usuario.belongsTo(models.rol, { foreignKey: 'rolid' });
    }
  }

  usuario.init({
    id: { 
      type: DataTypes.UUID, 
      primaryKey: true 
    },
    email: { 
      type: DataTypes.STRING, 
      unique: true, 
      allowNull: false 
    },
    passwordhash: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    nombre: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    protegido: { 
      type: DataTypes.BOOLEAN, 
      defaultValue: false 
    },
    correoVerificadoEn: DataTypes.DATE,
    authVersion: DataTypes.UUID,
    verificacionHash: DataTypes.STRING(64),
    verificacionVence: DataTypes.DATE,
    verificacionIntentos: DataTypes.INTEGER,
    recuperacionHash: DataTypes.STRING(64),
    recuperacionVence: DataTypes.DATE,
    recuperacionIntentos: DataTypes.INTEGER,
    mfaSecreto: DataTypes.STRING,
    mfaPendiente: DataTypes.STRING,
    mfaPendienteVence: DataTypes.DATE,
    mfaUltimoPaso: DataTypes.INTEGER,
    mfaRecuperacion: DataTypes.JSON,
    mfaRetoHash: DataTypes.STRING(64),
    mfaRetoVence: DataTypes.DATE,
    mfaRetoIntentos: DataTypes.INTEGER,
    rolid: { 
      type: DataTypes.UUID, 
      allowNull: false 
    }
  }, {
    sequelize,
    freezeTableName: true,
    modelName: 'usuario'
  });

  return usuario;
};