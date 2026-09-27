const SPAM_KEYWORDS = [
  "buy now",
  "click here",
  "free money",
  "casino",
  "viagra",
  "lottery",
  "crypto scam",
  "work from home",
  "make money fast",
];

const PROFANITY = [
  "damn",
  "hell",
  "shit",
  "fuck",
  "bitch",
  "asshole",
  "bastard",
];

const URL_PATTERN = /https?:\/\/|www\.|bit\.ly|tinyurl|t\.co/i;
const REPEATED_CHAR_PATTERN = /(.)\1{5,}/;

function moderateReviewText(text) {
  if (text === undefined || text === null) {
    return { allowed: false, reason: "Review text is required." };
  }

  const trimmed = String(text).trim();

  if (trimmed.length < 3) {
    return { allowed: false, reason: "Review is too short (minimum 3 characters)." };
  }

  if (trimmed.length > 2000) {
    return { allowed: false, reason: "Review is too long (maximum 2000 characters)." };
  }

  if (REPEATED_CHAR_PATTERN.test(trimmed)) {
    return { allowed: false, reason: "Review contains excessive repeated characters." };
  }

  if (URL_PATTERN.test(trimmed)) {
    return { allowed: false, reason: "Links are not allowed in reviews." };
  }

  const lower = trimmed.toLowerCase();

  for (const word of SPAM_KEYWORDS) {
    if (lower.includes(word)) {
      return { allowed: false, reason: "Review looks like spam and was rejected." };
    }
  }

  for (const word of PROFANITY) {
    const pattern = new RegExp(`\\b${word}\\b`, "i");
    if (pattern.test(trimmed)) {
      return { allowed: false, reason: "Please keep your review respectful (inappropriate language)." };
    }
  }

  const letters = trimmed.replace(/[^a-zA-Z]/g, "");
  if (letters.length > 20) {
    const upperCount = letters.replace(/[^A-Z]/g, "").length;
    if (upperCount / letters.length > 0.8) {
      return { allowed: false, reason: "Please avoid writing entire review in capital letters." };
    }
  }

  return { allowed: true };
}

module.exports = { moderateReviewText };
