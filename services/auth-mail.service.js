function configuration() {
    const { AUTH_FRONTEND_URL, RESEND_API_KEY, AUTH_MAIL_FROM, AUTH_MAILPIT_PORT } = process.env
    const development = process.env.NODE_ENV === 'development'
    const mailpit = development && /^\d{1,5}$/.test(AUTH_MAILPIT_PORT || '') &&
        Number(AUTH_MAILPIT_PORT) > 0 && Number(AUTH_MAILPIT_PORT) <= 65535

    if (!AUTH_FRONTEND_URL || !AUTH_MAIL_FROM || (!mailpit && !RESEND_API_KEY)) {
        const error = new Error('El servicio de correo no est� disponible.')
        error.statusCode = 503
        throw error
    }

    const origin = new URL(AUTH_FRONTEND_URL)
    const local = development && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)
    if (origin.protocol !== 'https:' && !(local && origin.protocol === 'http:')) {
        throw new Error('AUTH_FRONTEND_URL requiere HTTPS.')
    }
    if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
        throw new Error('AUTH_FRONTEND_URL debe contener �nicamente el origen.')
    }
    return { origin, apiKey: RESEND_API_KEY, from: AUTH_MAIL_FROM, mailpitPort: mailpit ? AUTH_MAILPIT_PORT : null }
}

async function sendAuthLink(email, purpose, token) {
    const { origin, apiKey, from, mailpitPort } = configuration()
    const verify = purpose === 'verify'
    const link = new URL(verify ? '/Auth/VerificarCorreo' : '/Auth/RestablecerPassword', origin)
    link.searchParams.set('token', token)
    const subject = verify ? 'Verifica tu correo' : 'Restablece tu contrase�a'
    const expiration = verify ? '24 horas' : '30 minutos'
    const text = subject + ' en Ecommerce:\n\n' + link.href +
        '\n\nEl enlace es de un solo uso y vence en ' + expiration +
        '. Si no solicitaste esta acci�n, ignora este mensaje.'

    const url = mailpitPort ? 'http://127.0.0.1:' + mailpitPort + '/api/v1/send' : 'https://api.resend.com/emails'
    const headers = { 'Content-Type': 'application/json' }
    if (!mailpitPort) headers.Authorization = 'Bearer ' + apiKey
    const payload = mailpitPort
        ? { From: { Email: from }, To: [{ Email: email }], Subject: subject, Text: text }
        : { from, to: [email], subject, text }

    const response = await fetch(url, {
        method: 'POST', headers, body: JSON.stringify(payload),
        redirect: 'error', signal: AbortSignal.timeout(7000)
    })
    await response.body?.cancel()
    if (!response.ok) throw new Error('El proveedor de correo rechaz� el env�o (' + response.status + ').')
}

module.exports = { configuration, sendAuthLink }
