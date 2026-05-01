import type { ReactNode } from "react";

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: string;
  image: string;
  category: string;
  featured?: boolean;
  time?: string;
  rating?: number;
  tags?: string[];
  stock?: number;
  position?: number;
}

export interface ServiceType {
  id: string;
  name: string;
  icon: ReactNode;
  categories: { id: string; name: string; icon: string }[];
  placeholder: string;
  itemLabel: string;
}

export interface Theme {
  id: string;
  name: string;
  primary: string;
  gradient: string;
  accent: string;
  custom?: boolean;
}

export interface Review {
  id: number;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  itemId?: number;
}

export interface Template {
  id: string;
  name: string;
  serviceType: string;
  theme: string;
  items: MenuItem[];
  description: string;
}

export interface Version {
  id: string;
  name: string;
  timestamp: Date;
  data: {
    businessName: string;
    serviceType: string;
    theme: string;
    items: MenuItem[];
  };
}

export interface PerformanceMetrics {
  pageSize: number;
  loadTime: number;
  bundleSize: number;
  imageCount: number;
  accessibilityScore: number;
}

