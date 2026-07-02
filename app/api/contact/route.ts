import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

interface ContactPayload {
  nombre: string
  email: string
  telefono: string
  venue: string
  ciudad: string
}

function isValidPayload(body: unknown): body is ContactPayload {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return (
    typeof b.nombre === 'string' && b.nombre.trim().length > 0 &&
    typeof b.email === 'string' && b.email.trim().length > 0 &&
    typeof b.telefono === 'string' && b.telefono.trim().length > 0 &&
    typeof b.venue === 'string' && b.venue.trim().length > 0 &&
    typeof b.ciudad === 'string' && b.ciudad.trim().length > 0
  )
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ detail: 'JSON inválido' }, { status: 400 })
  }

  if (!isValidPayload(body)) {
    return NextResponse.json({ detail: 'Faltan campos requeridos' }, { status: 400 })
  }

  const { nombre, email, telefono, venue, ciudad } = body

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json({ detail: 'Servicio de email no configurado' }, { status: 500 })
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'VIP Booster <onboarding@resend.dev>'
  const resend = new Resend(apiKey)

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: 'centraldepedidosweb@gmail.com',
      replyTo: email,
      subject: `Nueva solicitud de demo — ${venue}`,
      text: [
        `Nombre: ${nombre}`,
        `Email: ${email}`,
        `Teléfono: ${telefono}`,
        `Venue: ${venue}`,
        `Ciudad: ${ciudad}`,
      ].join('\n'),
      html: `
        <h2>Nueva solicitud de demo — VIP Booster</h2>
        <p><strong>Nombre:</strong> ${nombre}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Teléfono:</strong> ${telefono}</p>
        <p><strong>Venue:</strong> ${venue}</p>
        <p><strong>Ciudad:</strong> ${ciudad}</p>
      `,
    })

    if (error) {
      console.error('Error enviando email de contacto:', error)
      return NextResponse.json({ detail: 'No se pudo enviar el mensaje. Intenta de nuevo.' }, { status: 502 })
    }
  } catch (err) {
    console.error('Error enviando email de contacto:', err)
    return NextResponse.json({ detail: 'No se pudo enviar el mensaje. Intenta de nuevo.' }, { status: 502 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
