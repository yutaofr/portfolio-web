import Big from 'big.js';

// Big.js configuration
Big.DP = 10; // sufficient precision
Big.RM = Big.roundHalfUp;

export const PRICE_SCALING_FACTOR = new Big(10).pow(8);
export const SHARE_SCALING_FACTOR = new Big(10).pow(8);
export const AMOUNT_SCALING_FACTOR = new Big(10).pow(2);


export type BigNumber = Big;
// export { Big }; // Removed re-export to prevent circular/initialization issues
