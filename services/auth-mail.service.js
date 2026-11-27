const nodemailer = require('nodemailer')

function configuration() {
    const {
        RESEND_API_KEY, AUTH_MAIL_FROM, AUTH_MAILPIT_PORT,
        AUTH_GMAIL_USER, AUTH_GMAIL_APP_PASSWORD
    } = process.env
    const gmailUser = AUTH_GMAIL_USER?.trim()
    const gmailPassword = AUTH_GMAIL_APP_PASSWORD?.replace(/\s/g, '')
    const gmailConfigured = Boolean(gmailUser || gmailPassword)
    const gmail = gmailConfigured && gmailUser && gmailPassword
        ? { user: gmailUser, pass: gmailPassword }
        : null
    const development = process.env.NODE_ENV === 'development'
    const mailpit = development && /^\d{1,5}$/.test(AUTH_MAILPIT_PORT || '') &&
        Number(AUTH_MAILPIT_PORT) > 0 && Number(AUTH_MAILPIT_PORT) <= 65535

    if ((gmailConfigured && !gmail) ||
        (!gmail && (!AUTH_MAIL_FROM || (!mailpit && !RESEND_API_KEY)))) {
        const error = new Error('El servicio de correo no est� disponible.')
        error.statusCode = 503
        throw error
    }

    return { gmail, apiKey: RESEND_API_KEY, from: AUTH_MAIL_FROM, mailpitPort: mailpit ? AUTH_MAILPIT_PORT : null }
}

async function sendAuthCode(email, purpose, code) {
    const { gmail, apiKey, from, mailpitPort } = configuration()
    const subject = purpose === 'verify' ? 'Verifica tu correo' : 'Restablece tu contrase�a'
    const text = subject + ' en Ecommerce.\n\nTu c�digo es: ' + code +
        '\n\nVence en 10 minutos y solo se puede usar una vez. Si no solicitaste esta acci�n, ignora este mensaje.'

    if (gmail) {
        const transport = nodemailer.createTransport({
            service: 'gmail',
            auth: gmail,
            connectionTimeout: 7000,
            greetingTimeout: 7000,
            socketTimeout: 10000
        })
        try {
            await transport.sendMail({ from: gmail.user, to: email, subject, text })
        } catch {
            throw new Error('No fue posible enviar el correo mediante Gmail.')
        }
        return
    }

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

module.exports = { configuration, sendAuthCode }
