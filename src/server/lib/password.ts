import bcrypt from "bcryptjs";

// Пароли хранятся только хешем. bcryptjs, а не bcrypt: тот же алгоритм, но без нативной сборки —
// эталон должен собираться в любом окружении без компилятора.
const SALT_ROUNDS = 10;

export const hashPassword = (password: string): Promise<string> =>
  bcrypt.hash(password, SALT_ROUNDS);

export const verifyPassword = (password: string, hash: string): Promise<boolean> =>
  bcrypt.compare(password, hash);
