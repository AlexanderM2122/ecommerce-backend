'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('producto', {
      id: { 
        type: Sequelize.INTEGER, 
        autoIncrement: true, 
        primaryKey: true, 
        allowNull: false 
      },
      titulo: { 
        type: Sequelize.STRING, 
        defaultValue: 'Sin título' 
      },
      descripcion: { 
        type: Sequelize.STRING, 
        defaultValue: 'Sin descripcion' 
      },
      precio: { 
        type: Sequelize.DECIMAL(10, 2), 
        allowNull: false 
      },
      archivoid: {
        type: Sequelize.INTEGER, 
        allowNull: true,
        references: { 
          model: 'archivo', 
          key: 'id' 
        },
        onUpdate: 'CASCADE', 
        onDelete: 'SET NULL'
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
    await queryInterface.dropTable('producto');
  }
};