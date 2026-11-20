export interface Coordinate {
  lat: number;
  lng: number;
}

export interface RoutePoint {
  lat: string;
  lng: string;
}

export interface Route {
  origin: RoutePoint[];
  destination: RoutePoint[];
}

export interface Routes {
  [key: string]: {
    [id: string]: Route;
  };
}

export interface BaseRegistrationType {
  type: "personal" | "enterprise";
  first_name: string;
  last_name: string;
  phone: string;
  username: string;
  email_address: string;
  password: string;
  confirm_password: string;
}

export interface PersonalRegistrationType extends BaseRegistrationType {
  type: "personal";
}
export interface BusinessRegistrationType extends BaseRegistrationType {
  company_name: string;
  company_address: string;
  company_telephone: string;
  position: string;
  type: "enterprise";
}

export type RegistrationType =
  | PersonalRegistrationType
  | BusinessRegistrationType;

export type SiteForm = {
  site_code: string;
  type: number;
  board_facing: string;
  bound: string;
  size: string;
  ideal_view: string;
  address: string;
  company_id: string;
  traffic_count: number;
  vicinity_population: number;
  region: string | null;
  city: string | null;
  area: string | null;
  latitude: number;
  longitude: number;
  srp: number;
};

export type Upload = {
  upload_id: string;
  table: string;
  row_id: string;
  object_key: string;
  thumbnail_key: string;
  original_filename: string;
  content_type: string;
  file_size: number;
  created_at: string;
  modified_at: string;
  status: boolean;
};

export type Landmark = {
  landmark_id: string;
  name: string;
  latitude: number;
  longitude: number;
  categories: string[];
};

export type Impression = {
  period: Date;
  impressions: number;
};
export interface AudienceFilter {
  key: string;
  choices: string[];
  matchAll: boolean;
}

export interface PlanningRequest {
  dates: {
    from: string;
    to: string;
  };
  region?: string;
  owner?: string;
  filters: AudienceFilter[];
}
