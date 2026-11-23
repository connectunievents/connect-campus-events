export type MemberRole = "admin" | "organizer" | "scanner";
export type EventStatus = "draft" | "published" | "cancelled";
export type Visibility = "public" | "students";

export interface University {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  city: string | null;
  country: string | null;
  email_domains: string[];
  logo_url: string | null;
  cover_url: string | null;
  /** Attribution required by the cover photo's license. */
  cover_credit?: string | null;
  brand_color: string | null;
  website_url: string | null;
  is_active: boolean;
}

export interface TicketType {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  quantity: number;
  sold: number;
  max_per_order: number;
  students_only: boolean;
  sales_start: string | null;
  sales_end: string | null;
  sort_order: number;
}

export interface EventRow {
  id: string;
  university_id: string;
  title: string;
  summary: string | null;
  description: string | null;
  category: string;
  venue: string | null;
  campus: string | null;
  starts_at: string;
  ends_at: string | null;
  cover_url: string | null;
  visibility: Visibility;
  status: EventStatus;
  gate_opens_minutes_before: number;
  /** Official listing this event came from (real events). */
  source_url?: string | null;
  /** The official listing gave a date but no start time. */
  time_tbc?: boolean;
  /** Sample event created for the prototype. */
  is_demo?: boolean;
}

export type EventWithUni = EventRow & {
  universities: Pick<University, "slug" | "name" | "short_name" | "brand_color" | "logo_url"> | null;
  ticket_types?: Pick<TicketType, "price_cents" | "quantity" | "sold" | "currency">[];
};

export interface Sponsor {
  id: string;
  university_id: string | null;
  event_id: string | null;
  name: string;
  logo_url: string;
  website_url: string | null;
  tagline: string | null;
  tier: "platinum" | "gold" | "silver" | "partner";
  is_active: boolean;
  sort_order: number;
}

export interface Ticket {
  id: string;
  order_id: string;
  event_id: string;
  ticket_type_id: string;
  holder_name: string | null;
  code: string;
  status: "valid" | "used" | "void";
  checked_in_at: string | null;
  created_at: string;
}

export const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "music", label: "Music" },
  { id: "career", label: "Career" },
  { id: "tech", label: "Tech" },
  { id: "academic", label: "Academic" },
  { id: "sports", label: "Sports" },
  { id: "social", label: "Social" },
  { id: "arts", label: "Arts" },
  { id: "general", label: "Other" },
] as const;

export const EVENT_SELECT =
  "*, universities(slug,name,short_name,brand_color,logo_url), ticket_types(price_cents,quantity,sold,currency)";
