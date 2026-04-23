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
