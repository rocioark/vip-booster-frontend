export interface User {
  id: string
  email: string
  full_name: string
  role: 'super_admin' | 'venue_owner' | 'venue_staff'
  venue_id: string | null
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  user: User
}

export interface Venue {
  id: string
  name: string
  slug: string
  owner_name: string
  owner_email: string
  is_active: boolean
  created_at: string
}

export interface Event {
  id: string
  venue_id: string
  name: string
  slug: string
  artist_name: string | null
  description: string | null
  event_date: string
  event_start_time: string
  doors_open_time: string | null
  capacity: number | null
  venue_location: string | null
  status: 'draft' | 'published' | 'sold_out' | 'cancelled' | 'completed'
  sold_count?: number
  available?: number
  created_at: string
  updated_at: string
}

export interface VipPackage {
  id: string
  event_id: string
  name: string
  tier_level: number
  description: string | null
  color: string | null
  price: number
  currency: string
  quantity_total: number
  quantity_sold: number
  quantity_available: number
  features: Record<string, unknown>
  sort_order: number
  is_active: boolean
  is_sold_out: boolean
  sold_percentage: number
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  venue_id: string
  email: string
  full_name: string
  phone: string | null
  id_type: string | null
  id_number: string | null
  total_purchases: number
  total_tickets: number
  last_purchase_at: string | null
  created_at: string
}

// API uses payment_status (not status) and payment_gateway_fee
export interface Order {
  id: string
  order_number: string
  venue_id: string
  event_id: string
  customer_id: string
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled'
  payment_method: 'cash' | 'card' | 'pse' | 'nequi' | 'transfer'
  sales_channel: 'online' | 'pos' | 'phone'
  subtotal: number
  platform_fee: number
  payment_gateway_fee: number
  total: number
  currency: string
  holder_name?: string | null
  holder_email?: string | null
  payment_gateway_transaction_id: string | null
  refund_amount: number | null
  cancelled_at: string | null
  cancellation_reason: string | null
  discount_code: string | null
  discount_amount: number
  created_at: string
  updated_at: string
}

export interface Ticket {
  id: string
  ticket_code: string
  order_id: string
  event_id: string
  vip_package_id: string
  holder_name: string | null
  holder_email: string | null
  holder_phone: string | null
  status: 'valid' | 'used' | 'cancelled'
  checked_in_at: string | null
  check_in_location: string | null
  qr_code_url: string | null
  created_at: string
}

export interface CheckInResponse {
  success: boolean
  message: string
  ticket_code: string
  holder_name: string | null
  checked_in_at: string | null
}

export interface TopEvent {
  event_id: string
  event_name: string
  revenue: number
  tickets_sold: number
}

export interface VenueSummary {
  venue_id: string
  total_orders: number
  total_revenue: number
  tickets_sold: number
  total_events: number
  revenue_last_30_days: number
  top_events: TopEvent[]
}

export interface Discount {
  id: string
  venue_id: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed'
  value: number
  max_uses: number | null
  current_uses: number
  is_active: boolean
  valid_from: string | null
  valid_to: string | null
  created_at: string
}

export interface PublicVenue {
  id: string
  name: string
  slug: string
}

export interface PublicVenueDetail extends PublicVenue {
  created_at: string
  events: PublicEvent[]
}

export interface PublicEvent {
  id: string
  venue_id: string
  name: string
  slug: string
  description: string | null
  cover_image_url: string | null
  artist_name: string | null
  artist_image_url: string | null
  event_date: string
  event_start_time: string
  doors_open_time: string | null
  venue_location: string | null
  capacity: number | null
  status: 'published' | 'sold_out'
  available?: number
}

export interface PublicEventListItem {
  id: string
  slug: string
  name: string
  description: string | null
  artist_name: string | null
  cover_image_url: string | null
  artist_image_url: string | null
  event_date: string
  event_start_time: string
  venue_location: string | null
  status: 'draft' | 'published' | 'sold_out' | 'cancelled'
  venue_id: string
  venue_name: string
  venue_slug: string
}

export interface EventAnalytics {
  event_id: string
  event_name: string
  total_revenue: number
  tickets_sold: number
  occupancy_rate: number | null
  revenue_by_package: Record<string, number>
  sales_by_channel: Record<string, number>
  sales_by_payment_method: Record<string, number>
}
