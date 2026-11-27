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

## Seguridad de cuenta

Ejecuta la nueva migración antes de iniciar esta versión.

```powershell
npx --yes sequelize-cli@6 db:migrate
node -p "require('node:crypto').randomBytes(32).toString('hex')"
```

Guarda el valor generado en `AUTH_TOTP_KEY` y conserva la misma clave entre reinicios e instancias.

### Enviar correo con Gmail

Activa la verificación en dos pasos y genera una contraseña de aplicación en tu cuenta de Google.
Agrega estas variables en el `.env` del backend y reinicia la API.

```dotenv
AUTH_GMAIL_USER=tu-cuenta@gmail.com
AUTH_GMAIL_APP_PASSWORD=tu-contraseña-de-aplicación
```

Gmail tiene prioridad cuando ambas variables están configuradas y usa esa cuenta como remitente.

### Resend y correo local

Para correo real con Resend, usa
`RESEND_API_KEY` y `AUTH_MAIL_FROM` con un remitente del dominio verificado en Resend.

Para pruebas con Mailpit, deja las variables de Gmail vacías e inicia Mailpit. Usa `NODE_ENV=development`, `AUTH_MAILPIT_PORT=8025`
y `AUTH_MAIL_FROM=ecommerce@ejemplo.local`. El frontend usa HTTPS en el puerto 7275 con su perfil HTTPS.

```powershell
docker run --rm -p 127.0.0.1:8025:8025 axllent/mailpit
```

Las cuentas existentes, las creadas por un administrador y las cuentas de prueba deben
solicitar un código desde la pantalla de verificación antes de iniciar sesión. Con Mailpit,
abre http://localhost:8025 para consultar los correos enviados a las cuentas de prueba.

El registro y la recuperación envían un código de seis dígitos. Cada código vence en 10 minutos,
admite cinco intentos y solo puede usarse una vez. El reenvío está disponible al cabo de un minuto.
Tras confirmar el código de recuperación, hay 10 minutos para cambiar la contraseña.

Una vez autenticado, abre **Seguridad** para vincular una app TOTP. Guarda los códigos
de recuperación que se muestran al activar la función. El restablecimiento de contraseña
revoca los JWT anteriores y conserva el segundo factor. Si pierdes la app, usa uno de
tus códigos de recuperación.

El límite de acceso permite ocho solicitudes por cuenta cada 15 minutos, además de un
límite por IP. Al completar el inicio de sesión se reinicia el contador
de la cuenta. Los límites por IP y correo se conservan en memoria por instancia.
El reto MFA vence en cinco minutos y admite cinco intentos.
