/**
 * Calculator Engine for Lumos Pricing
 * Handles custom plan calculations with 10% Tech Ops fee
 */

/**
 * Calculate total from selected services
 * @param {Array} selectedServices - Array of service objects with price
 * @returns {number} Total price
 */
export const calculateSubtotal = (selectedServices) => {
    if (!selectedServices || selectedServices.length === 0) return 0;

    return selectedServices.reduce((total, service) => {
        return total + (service.price || 0);
    }, 0);
};

/**
 * Calculate 10% Tech Ops fee
 * @param {number} subtotal - Subtotal before fees
 * @returns {number} Tech Ops fee (10%)
 */
export const calculateTechOpsFee = (subtotal) => {
    return Math.round(subtotal * 0.10);
};

/**
 * Calculate final total with Tech Ops fee
 * @param {Array} selectedServices - Array of service objects
 * @returns {Object} Breakdown { subtotal, techOpsFee, total }
 */
export const calculateTotal = (selectedServices) => {
    const subtotal = calculateSubtotal(selectedServices);
    const techOpsFee = calculateTechOpsFee(subtotal);
    const total = subtotal + techOpsFee;

    return {
        subtotal,
        techOpsFee,
        total,
    };
};

/**
 * Format price in EGP with thousand separators
 * @param {number} amount - Price amount
 * @returns {string} Formatted price
 */
export const formatPrice = (amount) => {
    if (!amount && amount !== 0) return '0';
    return amount.toLocaleString('en-US');
};

/**
 * Format price with currency
 * @param {number} amount - Price amount
 * @param {string} currency - Currency symbol (default: EGP)
 * @returns {string} Formatted price with currency
 */
export const formatPriceWithCurrency = (amount, currency = 'EGP') => {
    return `${formatPrice(amount)} ${currency}`;
};

/**
 * Calculate savings for custom plan vs individual services
 * (Currently 10% is added, but this could show discount if bundles are cheaper)
 * @param {number} subtotal - Subtotal of services
 * @param {number} total - Total with fees
 * @returns {number} Amount added (negative means savings)
 */
export const calculateDifference = (subtotal, total) => {
    return total - subtotal;
};

/**
 * Get price breakdown summary
 * @param {Array} selectedServices - Array of service objects
 * @returns {Object} Complete breakdown
 */
export const getPriceBreakdown = (selectedServices) => {
    const { subtotal, techOpsFee, total } = calculateTotal(selectedServices);

    return {
        subtotal,
        techOpsFee,
        total,
        subtotalFormatted: formatPriceWithCurrency(subtotal),
        techOpsFeeFormatted: formatPriceWithCurrency(techOpsFee),
        totalFormatted: formatPriceWithCurrency(total),
        feePercentage: '10%',
    };
};
