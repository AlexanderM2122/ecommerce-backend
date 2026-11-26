# Ecommerce backend

API REST desarrollada con Node.js, Express, Sequelize y MySQL para administrar productos, categorías, usuarios, archivos, carrito y pedidos. Incluye autenticación JWT, autorización por roles y bitácora de acciones.

## Ejecutar en local

1. Clona el repositorio e instala las dependencias.

   ```sh
   git clone https://github.com/AlexanderM2122/ecommerce-backend.git
   cd ecommerce-backend
   npm ci
   npm install -g sequelize-cli
   ```

2. Copia `.env.example` a `.env`. Configura los datos de MySQL, `JWT_SECRET` y `SERVER_PORT=3000`. Crea la base de datos indicada en `DB_DATABASE`.

3. Ejecuta las migraciones.

   ```sh
   npx sequelize db:migrate
   ```

   Si la base de datos está vacía, carga los datos de demostración.

   ```sh
   npx sequelize db:seed:all --debug
   ```

4. Inicia la API.

   ```sh
   npm start
   ```

   El backend estará disponible en `http://localhost:3000` y la documentación Swagger en `http://localhost:3000/swagger`.

5. Para utilizar la aplicación completa, ejecuta el [frontend](https://github.com/AlexanderM2122/ecommerce-frontend) siguiendo las instrucciones de su README.
