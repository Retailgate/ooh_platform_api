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
