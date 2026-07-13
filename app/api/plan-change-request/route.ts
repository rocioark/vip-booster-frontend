import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// El venue_owner pide cambio de plan desde "Mi venue": no hay cobro
// online, así que solo se notifica al equipo para coordinarlo.

interface PlanChangePayload {
  venue_name: string
  slug: string
  current_plan: string
  owner_email: string
  message?: string
}

function isValidPayload(body: unknown): body is PlanChangePayload {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return (
    typeof b.venue_name === 'string' && b.venue_name.trim().length > 0 &&
    typeof b.slug === 'string' && b.slug.trim().length > 0 &&
    typeof b.current_plan === 'string' && b.current_plan.trim().length > 0 &&
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

  const { venue_name, slug, current_plan, owner_email, message } = body

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
      subject: `📈 Solicitud de cambio de plan — ${venue_name}`,
      text: [
        `Un venue quiere cambiar de plan.`,
        ``,
        `Venue: ${venue_name} (/${slug})`,
        `Plan actual: ${current_plan}`,
        `Email del owner: ${owner_email}`,
        `Mensaje: ${message || '—'}`,
        ``,
        `Coordina el pago y cambia el plan desde el menú Venues del admin.`,
      ].join('\n'),
      html: `
        <h2>Solicitud de cambio de plan — VIP Booster</h2>
        <p><strong>Venue:</strong> ${venue_name} (/${slug})</p>
        <p><strong>Plan actual:</strong> ${current_plan}</p>
        <p><strong>Email del owner:</strong> ${owner_email}</p>
        <p><strong>Mensaje:</strong> ${message || '—'}</p>
        <p>Coordina el pago y cambia el plan desde el <strong>menú Venues</strong> del admin.</p>
      `,
    })

    if (error) {
      console.error('Error enviando solicitud de cambio de plan:', error)
      return NextResponse.json({ detail: 'No se pudo enviar la solicitud' }, { status: 502 })
    }
  } catch (err) {
    console.error('Error enviando solicitud de cambio de plan:', err)
    return NextResponse.json({ detail: 'No se pudo enviar la solicitud' }, { status: 502 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
