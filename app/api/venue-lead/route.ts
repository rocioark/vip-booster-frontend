import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// Notifica al equipo cuando un venue se registra con plan de pago
// (queda "pendiente de activación" hasta coordinar el pago manualmente).

interface VenueLeadPayload {
  venue_name: string
  slug: string
  plan: string
  owner_name: string
  owner_email: string
  phone?: string
}

function isValidPayload(body: unknown): body is VenueLeadPayload {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return (
    typeof b.venue_name === 'string' && b.venue_name.trim().length > 0 &&
    typeof b.slug === 'string' && b.slug.trim().length > 0 &&
    typeof b.plan === 'string' && b.plan.trim().length > 0 &&
    typeof b.owner_name === 'string' && b.owner_name.trim().length > 0 &&
    typeof b.owner_email === 'string' && b.owner_email.trim().length > 0
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

  const { venue_name, slug, plan, owner_name, owner_email, phone } = body

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
      replyTo: owner_email,
      subject: `💰 Venue pendiente de activación — ${venue_name} (${plan})`,
      text: [
        `Nuevo registro self-service con plan de pago.`,
        ``,
        `Venue: ${venue_name} (/${slug})`,
        `Plan elegido: ${plan}`,
        `Dueño: ${owner_name}`,
        `Email: ${owner_email}`,
        `Teléfono: ${phone || '—'}`,
        ``,
        `Coordina el pago y actívalo desde el menú Venues del admin.`,
      ].join('\n'),
      html: `
        <h2>Venue pendiente de activación — VIP Booster</h2>
        <p>Nuevo registro self-service con <strong>plan de pago</strong>.</p>
        <p><strong>Venue:</strong> ${venue_name} (/${slug})</p>
        <p><strong>Plan elegido:</strong> ${plan}</p>
        <p><strong>Dueño:</strong> ${owner_name}</p>
        <p><strong>Email:</strong> ${owner_email}</p>
        <p><strong>Teléfono:</strong> ${phone || '—'}</p>
        <p>Coordina el pago y actívalo desde el <strong>menú Venues</strong> del admin.</p>
      `,
    })

    if (error) {
      console.error('Error enviando notificación de venue lead:', error)
      return NextResponse.json({ detail: 'No se pudo enviar la notificación' }, { status: 502 })
    }
  } catch (err) {
    console.error('Error enviando notificación de venue lead:', err)
    return NextResponse.json({ detail: 'No se pudo enviar la notificación' }, { status: 502 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
