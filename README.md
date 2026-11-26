# Ecommerce backend

API REST desarrollada con Node.js, Express, Sequelize y MySQL para administrar productos, categor�as, usuarios, archivos, carrito y pedidos. Incluye autenticaci�n JWT, autorizaci�n por roles y bit�cora de acciones.

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

   Si la base de datos est� vac�a, carga los datos de demostraci�n.

   ```sh
   npx sequelize db:seed:all --debug
   ```

4. Inicia la API.

   ```sh
   npm start
   ```

   El backend estar� disponible en `http://localhost:3000` y la documentaci�n Swagger en `http://localhost:3000/swagger`.

5. Para utilizar la aplicaci�n completa, ejecuta el [frontend](https://github.com/AlexanderM2122/ecommerce-frontend) siguiendo las instrucciones de su README.

## Seguridad de cuenta

Ejecuta la nueva migraci�n antes de iniciar esta versi�n.

```powershell
npx --yes sequelize-cli@6 db:migrate
node -p "require('node:crypto').randomBytes(32).toString('hex')"
```

Guarda el valor generado en `AUTH_TOTP_KEY` y conserva la misma clave entre reinicios e instancias.
Configura `AUTH_FRONTEND_URL` con el origen HTTPS del frontend. Para correo real, usa
`RESEND_API_KEY` y `AUTH_MAIL_FROM` con un remitente del dominio verificado en Resend.

Para pruebas locales, inicia Mailpit y usa `NODE_ENV=development`, `AUTH_MAILPIT_PORT=8025`
y `AUTH_MAIL_FROM=ecommerce@ejemplo.local`. El frontend usa HTTPS en el puerto 7275 con su perfil HTTPS.

```powershell
docker run --rm -p 127.0.0.1:8025:8025 axllent/mailpit
```

Las cuentas existentes, las creadas por un administrador y las cuentas de prueba deben
solicitar el enlace desde la pantalla de acceso antes de iniciar sesi�n. Con Mailpit,
abre http://localhost:8025 para consultar los correos enviados a las cuentas de prueba.

Una vez autenticado, abre **Seguridad** para vincular una app TOTP. Guarda los c�digos
de recuperaci�n que se muestran al activar la funci�n. El restablecimiento de contrase�a
revoca los JWT anteriores y conserva el segundo factor. Si pierdes la app, usa uno de
tus c�digos de recuperaci�n.

El l�mite de acceso permite ocho solicitudes por cuenta cada 15 minutos, adem�s de un
l�mite por IP. Al completar el inicio de sesi�n se reinicia el contador
de la cuenta. Los l�mites por IP y correo se conservan en memoria por instancia.
El reto MFA vence en cinco minutos y admite cinco intentos.
