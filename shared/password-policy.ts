export type PasswordPolicyLevel = "standard" | "enhanced_fstek";

export interface PasswordPolicyConfig {
  level: PasswordPolicyLevel;
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigits: boolean;
  requireSpecial: boolean;
  checkDictionary: boolean;
  generatorLength: number;
}

export const DEFAULT_STANDARD_POLICY: PasswordPolicyConfig = {
  level: "standard",
  minLength: 8,
  requireUppercase: false,
  requireLowercase: false,
  requireDigits: true,
  requireSpecial: false,
  checkDictionary: false,
  generatorLength: 12,
};

export const DEFAULT_ENHANCED_POLICY: PasswordPolicyConfig = {
  level: "enhanced_fstek",
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireDigits: true,
  requireSpecial: true,
  checkDictionary: true,
  generatorLength: 16,
};

const WEAK_PASSWORDS = [
  "password", "123456", "12345678", "qwerty", "abc123", "monkey", "master",
  "dragon", "111111", "baseball", "iloveyou", "trustno1", "sunshine", "letmein",
  "welcome", "shadow", "superman", "michael", "пароль", "йцукен", "любовь",
  "привет", "наташа", "максим", "андрей", "1234567890", "password123",
  "admin", "administrator", "root", "user", "test", "guest", "qwerty123",
  "password1", "123456789", "12345", "1234", "123123", "654321", "000000",
];

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: "weak" | "medium" | "strong" | "very_strong";
  score: number;
}

export function validatePassword(password: string, config: PasswordPolicyConfig): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  if (password.length < config.minLength) {
    errors.push(`Минимум ${config.minLength} символов`);
  } else {
    score += 20;
  }

  if (password.length >= 16) score += 10;

  const hasUppercase = /[A-ZА-ЯЁ]/.test(password);
  const hasLowercase = /[a-zа-яё]/.test(password);
  const hasDigits = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);

  if (config.requireUppercase && !hasUppercase) {
    errors.push("Необходима заглавная буква");
  }
  if (hasUppercase) score += 15;

  if (config.requireLowercase && !hasLowercase) {
    errors.push("Необходима строчная буква");
  }
  if (hasLowercase) score += 15;

  if (config.requireDigits && !hasDigits) {
    errors.push("Необходима цифра");
  }
  if (hasDigits) score += 15;

  if (config.requireSpecial && !hasSpecial) {
    errors.push("Необходим спецсимвол (!@#$%^&*)");
  }
  if (hasSpecial) score += 15;

  if (config.checkDictionary) {
    const lowerPwd = password.toLowerCase();
    if (WEAK_PASSWORDS.some(w => lowerPwd.includes(w))) {
      errors.push("Пароль слишком простой (содержит распространённую комбинацию)");
      score = Math.max(0, score - 30);
    }
  }

  if (/(.)\1{3,}/.test(password)) {
    errors.push("Не используйте более 3 одинаковых символов подряд");
    score = Math.max(0, score - 10);
  }

  const sequential = "abcdefghijklmnopqrstuvwxyz0123456789йцукенгшщзхъфывапролджэячсмитьбю";
  for (let i = 0; i < password.length - 3; i++) {
    const chunk = password.toLowerCase().substring(i, i + 4);
    if (sequential.includes(chunk)) {
      score = Math.max(0, score - 10);
      break;
    }
  }

  score = Math.min(100, Math.max(0, score));

  let strength: "weak" | "medium" | "strong" | "very_strong" = "weak";
  if (score >= 80) strength = "very_strong";
  else if (score >= 60) strength = "strong";
  else if (score >= 40) strength = "medium";

  return { isValid: errors.length === 0, errors, strength, score };
}

export function generatePassword(length: number = 16): string {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%&*?";

  let password = "";
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += special[Math.floor(Math.random() * special.length)];

  const allChars = uppercase + lowercase + digits + special;
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  return password.split("").sort(() => Math.random() - 0.5).join("");
}

export function getPasswordRequirementsText(config: PasswordPolicyConfig): string[] {
  const reqs: string[] = [];
  reqs.push(`Минимум ${config.minLength} символов`);
  if (config.requireUppercase) reqs.push("Заглавная буква (A-Z)");
  if (config.requireLowercase) reqs.push("Строчная буква (a-z)");
  if (config.requireDigits) reqs.push("Цифра (0-9)");
  if (config.requireSpecial) reqs.push("Спецсимвол (!@#$%^&*)");
  if (config.checkDictionary) reqs.push("Не словарный пароль");
  return reqs;
}
