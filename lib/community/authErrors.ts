/* Google girişinden dönen hata kodlarının kullanıcıya açıklaması. Teknik ayrıntı gösterilmez; her durumda yeniden
   denenebilir. Kodlar Better Auth'tan gelir (ör. state_mismatch: giriş başlatılan oturum bulunamadı ya da süresi doldu). */
export function authErrorMessage(code: string | null): string {
  switch (code) {
    case "access_denied":
      return "Google girişi iptal edildi ya da bu hesap için izin verilmedi. İstersen yeniden dene.";
    case "state_mismatch":
    case "state_security_mismatch":
    case "state_not_found":
    case "please_restart_the_process":
      return "Giriş tamamlanamadı: Google sayfasında uzun süre beklendi ya da giriş başka bir pencerede bitirildi. Yeniden dene; birkaç saniye sürer.";
    default:
      return "Google ile giriş tamamlanamadı. Yeniden dene; sorun sürerse bize bildir.";
  }
}
