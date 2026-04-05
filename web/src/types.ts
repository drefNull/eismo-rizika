export interface AccidentPoint {
  lat: number; lon: number;
  date: string; atype: string;
  schema1: string; schema2: string;
  killed: number; injured: number;
  severity: 'fatal' | 'injury' | 'property';
  drunk: boolean;
  weather: string; surface: string; time_of_day: string;
  culprit_ages: number[]; culprit_bac: number[];
}

export interface AccidentData {
  by_year: Record<string, AccidentPoint[]>;
  stats: {
    by_year: Record<string, { fatal: number; injury: number; property: number }>;
    total: { fatal: number; injury: number; property: number };
  };
}

export interface StatsData {
  summary: { total: number; deaths: number; injured: number; drunk: number };
  by_year: { year: number; total: number; deaths: number; injured: number; drunk: number }[];
  by_type: { name: string; count: number }[];
  by_weather: { name: string; count: number }[];
  by_surface: { name: string; count: number }[];
  by_time_of_day: { name: string; count: number }[];
  by_hour: { hour: number; count: number }[];
  by_municipality: { name: string; count: number }[];
  by_road_type: { name: string; count: number }[];
  by_speed_limit: { speed: number; count: number }[];
  by_gender: { name: string; count: number }[];
  by_participant_category: { name: string; count: number }[];
  by_seatbelt: { name: string; count: number }[];
  by_age_group: { group: string; count: number }[];
}
