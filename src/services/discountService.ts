export interface DiscountCode {
  code: string;
  discount_percent: number;
}

export const validateDiscountCode = async (code: string): Promise<DiscountCode | null> => null;