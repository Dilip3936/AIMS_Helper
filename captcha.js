const captchaImageElement = document.getElementById('appCaptchaLoginImg');
const captchaInputElement = document.getElementById('captcha');

if (captchaImageElement && captchaInputElement) {
  const imageUrl = captchaImageElement.src;
  const urlParts = imageUrl.split('/');
  const captchaCode = urlParts[urlParts.length - 1];

  captchaInputElement.value = captchaCode;
  
}