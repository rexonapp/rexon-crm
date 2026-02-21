/* ─────────────────────────────────────────────
   AGENT TYPES
   ───────────────────────────────────────────── */

   export interface Agent {
    id: number;
    user_id: number | null;
    full_name: string;
    email: string;
    mobile_number: string | null;
    city: string | null;
    address: string | null;
    date_of_birth: string | null;
    gender: string | null;
    agency_name: string | null;
    license_number: string | null;
    experience_years: number;
    properties_managed: number;
    specialization: string | null;
    profile_photo_s3_key: string | null;
    profile_photo_s3_url: string | null;
    kyc_document_s3_key: string | null;
    kyc_document_s3_url: string | null;
    terms_accepted: boolean;
    is_verified: boolean;
    status: AgentStatus;
    created_at: string;
    updated_at: string;
  }
  
  export type AgentStatus = 'pending' | 'active' | 'suspended' | 'rejected';
  
  export interface AgentFormData {
    full_name: string;
    email: string;
    mobile_number: string;
    city: string;
    address: string;
    date_of_birth: string;
    gender: string;
    agency_name: string;
    license_number: string;
    experience_years: string;
    properties_managed: string;
    specialization: string;
    terms_accepted: boolean;
  }
  
  /* ─────────────────────────────────────────────
     DOMAIN TYPES
     ───────────────────────────────────────────── */
  
  export type DomainStatus =
    | 'available'
    | 'taken'
    | 'pending'
    | 'active'
    | 'expired'
    | 'reserved';
  
  export type DomainType = 'custom' | 'platform' | 'subdomain';
  
  export interface Domain {
    id: number;
    agent_id: number | null;
    domain_name: string;
    tld: string;
    full_domain: string;
    is_wildcard: boolean;
    wildcard_base: string | null;
    subdomain_prefix: string | null;
    domain_type: DomainType;
    status: DomainStatus;
    price_usd: string | null;
    renewal_price_usd: string | null;
    registered_at: string | null;
    expires_at: string | null;
    auto_renew: boolean;
    nameservers: string[] | null;
    dns_records: Record<string, any> | null;
    ssl_enabled: boolean;
    ssl_issued_at: string | null;
    ssl_expires_at: string | null;
    is_verified: boolean;
    verification_token: string | null;
    verified_at: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
  }
  
  export interface DomainAvailabilityResult {
    query: string;           // what the user typed
    domain_name: string;     // normalized slug
    tld: string;
    full_domain: string;
    available: boolean;
    status: DomainStatus | 'invalid';
    is_wildcard_subdomain: boolean;
    wildcard_base?: string;
    price_usd?: number | null;
    message: string;
  }
  
  export interface DomainFormData {
    agent_id: string;
    domain_name: string;
    tld: string;
    domain_type: DomainType;
    is_wildcard: boolean;
    wildcard_base: string;
    subdomain_prefix: string;
    price_usd: string;
    renewal_price_usd: string;
    auto_renew: boolean;
    notes: string;
  }
  
  /* ─────────────────────────────────────────────
     API RESPONSE TYPES
     ───────────────────────────────────────────── */
  
  export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
  }