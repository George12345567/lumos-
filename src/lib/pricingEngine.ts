import { PACKAGES, SERVICES, CATEGORIES, getAllServices, Service, InvoiceItem } from '@/data/pricing';
import { DiscountCode } from '@/services/discountService';

// ── Types ─────────────────────────────────────────────────────────────

export interface PricingEngineInputs {
  mode: 'packages' | 'custom' | null;
  selectedPkg: string | null;
  selectedServices: Set<string>;
  appliedPromo: DiscountCode | null;
  /** True if the user toggled the 3-month commitment */
  is3MonthCommitment: boolean;
  /** True if the user correctly guessed the Lumos inspiration (Harry Potter) */
  easterEggStage1Unlocked: boolean;
  /** True if the user typed "Lumos Maxima" */
  easterEggStage2Unlocked: boolean;
}

export interface UnlockedReward {
  id: string;
  title: string;
  titleAr: string;
  type: 'free_service' | 'discount' | 'bonus_perk';
  value?: number; // E.g., discount percentage or specific ID
}

export interface PricingEngineOutputs {
  subtotal: number;       // The original total before ANY discounts
  finalTotal: number;     // The final total to pay
  totalCashDiscountValue: number; // EGP discount amount
  totalDiscountPercentage: number; // Effective total percentage off (capped at 25%)
  
  promoDiscountValue: number; // Exact amount discounted by the explicit promo code, if any
  
  items: InvoiceItem[];
  itemCount: number;

  unlockedRewards: UnlockedReward[]; // Rewards shown in the progress bar
  bonusPerks: UnlockedReward[];      // Extra perks (like Free Social Media Templates) if cash discount cap is exceeded
  
  // Progress bar data
  eligibleServiceCount: number; // How many progress-eligible services selected
}

// ── Configuration ─────────────────────────────────────────────────────

const DISCOUNT_CAP_PERCENT = 25; // 25%

// Non-cash perks awarded if cash discount > 25% ceiling
const OVERFLOW_PERKS = [
  { id: 'perk_mini_guide', title: 'Free Mini Brand Guide', titleAr: 'دليل هوية مصغر مجاني' },
  { id: 'perk_social_templates', title: 'Free Social Media Templates', titleAr: 'قوالب سوشيال ميديا مجانية' },
  { id: 'perk_extra_revision', title: 'Extra Free Revision', titleAr: 'تعديل إضافي مجاني' },
  { id: 'perk_creative_bonus', title: 'Free Creative Bonus', titleAr: 'بونص إبداعي مجاني' }
];

export const PROGRESS_TIERS = [
  { requiredCount: 2, rewardId: 'sec_ssl', title: 'Free SSL Setup', titleAr: 'إعداد SSL مجاني' },
  { requiredCount: 3, rewardId: 'growth_pixel', title: 'Free Pixel Setup', titleAr: 'إعداد بيكسل مجاني' },
  { requiredCount: 4, label: '10% Discount', labelAr: 'خصم 10%', discountPercent: 10 },
];

// ── Engine ────────────────────────────────────────────────────────────

export function calculatePricing(inputs: PricingEngineInputs): PricingEngineOutputs {
  const { mode, selectedPkg, selectedServices, appliedPromo, is3MonthCommitment, easterEggStage1Unlocked, easterEggStage2Unlocked } = inputs;

  let subtotal = 0;
  const items: InvoiceItem[] = [];
  const unlockedRewards: UnlockedReward[] = [];
  const bonusPerks: UnlockedReward[] = [];
  let baseDiscountPercent = 0; // Accumulated progressive/bundle percentage
  
  let eligibleServiceCount = 0;

  if (mode === 'packages' && selectedPkg) {
    const pkg = Object.values(PACKAGES).find(p => p.id === selectedPkg);
    if (pkg) {
      subtotal = pkg.originalPrice; 
      // A package inherently gets a 15% base bundle discount (before 3-month offer)
      baseDiscountPercent = 15;
      
      pkg.includedServices.forEach(sid => {
        const svc = getAllServices().find(s => s.id === sid);
        if (svc) {
          const cat = Object.entries(SERVICES).find(([, arr]) => arr.some(s => s.id === sid))?.[0] || '';
          items.push({ id: svc.id, name: svc.name, nameAr: svc.nameAr, price: svc.price, category: cat });
        }
      });
    }
  } else if (mode === 'custom') {
    const all = getAllServices();
    selectedServices.forEach(id => {
      const svc = all.find(x => x.id === id);
      if (svc) {
        subtotal += svc.price;
        const cat = Object.entries(SERVICES).find(([, arr]) => arr.some(s => s.id === id))?.[0] || '';
        items.push({ id: svc.id, name: svc.name, nameAr: svc.nameAr, price: svc.price, category: cat });
        eligibleServiceCount++;
      }
    });

    // Progressive unlocks (only in custom mode)
    if (eligibleServiceCount >= 2) {
      unlockedRewards.push({ id: 'rew_ssl', title: 'Free SSL Setup', titleAr: 'إعداد SSL مجاني', type: 'free_service', value: 500 }); // sec_ssl price = 500
    }
    if (eligibleServiceCount >= 3) {
      unlockedRewards.push({ id: 'rew_pixel', title: 'Free Pixel Setup', titleAr: 'إعداد بيكسل مجاني', type: 'free_service', value: 1000 }); // growth_pixel price = 1000
    }
    
    // Check Brand Bundle
    const brandItems = SERVICES[CATEGORIES.BRAND_IDENTITY] || [];
    const hasAllBrandItems = brandItems.length > 0 && brandItems.every(s => selectedServices.has(s.id));
    
    if (hasAllBrandItems) {
      baseDiscountPercent = 15; // Full bundle overrides the 10% tier
      unlockedRewards.push({ id: 'rew_brand_bundle', title: 'Full Brand Bundle (15% Off)', titleAr: 'باقة ההوية الكاملة (خصم 15%)', type: 'discount', value: 15 });
    } else if (eligibleServiceCount >= 4) {
      baseDiscountPercent = 10;
      unlockedRewards.push({ id: 'rew_tier_4', title: '4+ Services (10% Off)', titleAr: '4+ خدمات (خصم 10%)', type: 'discount', value: 10 });
    }
  }

  // ── Extra Cash Discounts ──
  let additionalDiscountPercent = 0;

  if (is3MonthCommitment) {
    additionalDiscountPercent += 10;
    unlockedRewards.push({ id: 'rew_3month', title: '3-Month Commitment (10% Off)', titleAr: 'التزام 3 شهور (خصم 10%)', type: 'discount', value: 10 });
  }

  // ── Easter Egg Logic ──
  if (easterEggStage1Unlocked) {
    // Attempt to give 5% cash discount for answering the trivia correctly.
    // If the cap is reached, the overflow logic below converts this to a perk.
    additionalDiscountPercent += 5;
    unlockedRewards.push({ id: 'egg_1', title: 'Lumos Trivia (+5% Bonus)', titleAr: 'بونص لوموس (+5% خصم)', type: 'discount', value: 5 });
  }
  
  if (easterEggStage2Unlocked) {
    // Grant explicit non-cash perk for the ultimate spell
    bonusPerks.push({ id: 'egg_2', title: 'Secret Bonus: Free Social Media Templates', titleAr: 'بونص سري: قوالب سوشيال ميديا مجانية', type: 'bonus_perk' });
  }

  // ── Calculate Overflows and Caps ──
  const requestedTotalPercent = baseDiscountPercent + additionalDiscountPercent;
  let finalAppliedPercent = requestedTotalPercent;
  let overflowPercent = 0;

  if (requestedTotalPercent > DISCOUNT_CAP_PERCENT) {
    finalAppliedPercent = DISCOUNT_CAP_PERCENT;
    overflowPercent = requestedTotalPercent - DISCOUNT_CAP_PERCENT;
  }

  // Convert overflow into non-cash perks
  if (overflowPercent > 0) {
    // 1 perk for the first overflow block, maybe up to 2 depending on how far it goes
    if (overflowPercent >= 5) bonusPerks.push({ ...OVERFLOW_PERKS[0], type: 'bonus_perk' });
    if (overflowPercent >= 10) bonusPerks.push({ ...OVERFLOW_PERKS[1], type: 'bonus_perk' });
    if (overflowPercent >= 15) bonusPerks.push({ ...OVERFLOW_PERKS[2], type: 'bonus_perk' });
  }

  // Calculate base cash discount using the subtotal
  // (We use subtotal to calculate percentage off)
  let totalCashDiscountValue = subtotal * (finalAppliedPercent / 100);

  // Add the value of "Free Services" to the cash discount value ONLY IF they are also selected as actual items.
  // Actually, standard behavior: if the user selected 'sec_ssl', we discount its price. 
  // If they didn't manually select it, we just list it in the perks/rewards, they get it anyway but it doesn't inflate the subtotal.
  if (mode === 'custom') {
    if (eligibleServiceCount >= 2 && selectedServices.has('sec_ssl')) {
       // Since the user selected it, its price is in `subtotal`. We must discount it entirely.
       // However, to prevent double-dipping (getting 15% off the full subtotal AND taking the $500 off),
       // we usually deduct the free item's price from the subtotal before the % discount.
       // For simplicity and client happiness, Lumos often just adds the free item value to the total discount.
       const ssl = getAllServices().find(s => s.id === 'sec_ssl');
       if (ssl) {
         // Deduct the percent discount already applied to this $500 so we don't discount it twice
         const alreadyDiscounted = ssl.price * (finalAppliedPercent / 100);
         totalCashDiscountValue += (ssl.price - alreadyDiscounted);
       }
    }
    
    if (eligibleServiceCount >= 3 && selectedServices.has('growth_pixel')) {
       const pixel = getAllServices().find(s => s.id === 'growth_pixel');
       if (pixel) {
         const alreadyDiscounted = pixel.price * (finalAppliedPercent / 100);
         totalCashDiscountValue += (pixel.price - alreadyDiscounted);
       }
    }
  }

  // ── Explicit Promo Code ──
  let promoDiscountValue = 0;
  if (appliedPromo) {
    if (appliedPromo.discount_type === 'percentage') {
      promoDiscountValue = subtotal * (appliedPromo.discount_value / 100);
    } else if (appliedPromo.discount_type === 'fixed') {
      promoDiscountValue = appliedPromo.discount_value;
    }
    totalCashDiscountValue += promoDiscountValue;
  }

  const finalTotal = Math.max(0, subtotal - totalCashDiscountValue);

  return {
    subtotal,
    finalTotal,
    totalCashDiscountValue,
    totalDiscountPercentage: finalAppliedPercent,
    promoDiscountValue,
    items,
    itemCount: items.length,
    unlockedRewards,
    bonusPerks,
    eligibleServiceCount
  };
}
