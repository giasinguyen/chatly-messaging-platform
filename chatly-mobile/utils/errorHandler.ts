/**
 * Maps backend error codes / axios errors to Vietnamese user-facing messages
 */
export function getApiErrorMessage(error: any, fallback: string): string {
  // Network error – no response from server
  if (!error?.response) {
    if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      return 'Kết nối quá chậm. Vui lòng thử lại.';
    }
    return 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
  }

  const code: number = error.response.data?.code;
  const serverMessage: string | undefined = error.response.data?.message;

  // Map known error codes to Vietnamese
  const codeMessages: Record<number, string> = {
    1104: 'Email/số điện thoại hoặc mật khẩu không đúng.',
    1101: 'Tài khoản đã tồn tại.',
    1102: 'Email này đã được sử dụng.',
    1103: 'Số điện thoại này đã được sử dụng.',
    1106: 'Tên đăng nhập đã được sử dụng.',
    1105: 'Mật khẩu phải có ít nhất 6 ký tự.',
    1601: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    1602: 'Token không hợp lệ hoặc đã hết hạn.',
    1600: 'Bạn không có quyền thực hiện thao tác này.',
    9999: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
  };

  if (code && codeMessages[code]) {
    return codeMessages[code];
  }

  return serverMessage || fallback;
}
