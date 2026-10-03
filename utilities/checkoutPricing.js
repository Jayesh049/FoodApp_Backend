/**
 * Server cart total. Matches CartProvider.getTotalWithDiscount:
 * line = price * qty; charged = line - line * discount / 100.
 * Client-sent price is never an input.
 */

function chargedLine(plan, quantity) {
  const qty = Math.max(1, Number(quantity) || 1);
  const price = Number(plan.price);
  if (!Number.isFinite(price) || price < 0) {
    const err = new Error("Plan price is invalid");
    err.statusCode = 400;
    throw err;
  }
  const discount = Number(plan.discount) || 0;
  const line = price * qty;
  const charged = line - (line * discount) / 100;
  return Math.round(charged * 100) / 100;
}

function cartTotalFromPlans(lines) {
  const total = lines.reduce((sum, line) => sum + chargedLine(line.plan, line.quantity), 0);
  return Math.round(total * 100) / 100;
}

function toPaise(rupees) {
  return Math.round(Number(rupees) * 100);
}

module.exports = {
  chargedLine,
  cartTotalFromPlans,
  toPaise,
};
