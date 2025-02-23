import { z } from 'zod';

// Simple encryption for localStorage (this is not meant for highly sensitive data)
const encryptKey = (text: string): string => {
  return btoa(text);
};

const decryptKey = (encryptedText: string): string => {
  try {
    return atob(encryptedText);
  } catch {
    return '';
  }
};

export const ApiKeySchema = z.string().min(1, "API key is required");

export const storeApiKey = (key: string) => {
  const validKey = ApiKeySchema.parse(key);
  const encryptedKey = encryptKey(validKey);
  localStorage.setItem('openai_api_key', encryptedKey);
};

export const getApiKey = (): string | null => {
  const encryptedKey = localStorage.getItem('openai_api_key');
  if (!encryptedKey) return null;
  
  try {
    const decryptedKey = decryptKey(encryptedKey);
    ApiKeySchema.parse(decryptedKey);
    return decryptedKey;
  } catch {
    return null;
  }
};

export const removeApiKey = () => {
  localStorage.removeItem('openai_api_key');
}; 