
'use strict';
const bcrypt = require('bcrypt');
const crypto = require('crypto');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const AdministradorUUID = crypto.randomUUID();
    const UsuarioUUID = crypto.randomUUID();

    await queryInterface.bulkInsert('rol', [
      {
        id: AdministradorUUID,
        nombre: 'Administrador',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: UsuarioUUID,
        nombre: 'Usuario',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    await queryInterface.bulkInsert('usuario', [
      {
        id: crypto.randomUUID(),
        email: 'admin@ejemplo.local',
        passwordhash: await bcrypt.hash('patito', 10),
        nombre: 'Administrador de prueba',
        rolid: AdministradorUUID,
        protegido: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: crypto.randomUUID(),
        email: 'usuario@ejemplo.local',
        passwordhash: await bcrypt.hash('patito', 10),
        nombre: 'Usuario de prueba',
        rolid: UsuarioUUID,
        protegido: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('usuario', null, {});
    await queryInterface.bulkDelete('rol', null, {});
  }
};