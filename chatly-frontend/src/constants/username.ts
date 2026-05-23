export const USERNAME_ALLOWED_REGEX = /^[A-Za-z0-9]+$/;
export const DISPLAY_NAME_ALLOWED_REGEX = /^[\p{L}\p{N}\s._'\-]{1,50}$/u;
export const USERNAME_INVALID_MESSAGE =
    "Username can only contain letters and numbers (no special characters).";
export const DISPLAY_NAME_INVALID_MESSAGE =
    "Display name can contain letters, numbers, spaces and . _ ' - (max 50 characters).";
