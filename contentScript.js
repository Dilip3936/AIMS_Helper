const captchaImageElement = document.getElementById('appCaptchaLoginImg');

const captchaInputElement = document.getElementById('captcha');

if (captchaImageElement && captchaInputElement) {
  const imageUrl = captchaImageElement.src;
  const urlParts = imageUrl.split('/');
  const captchaCode = urlParts[urlParts.length - 1];

  captchaInputElement.value = captchaCode;

  console.log(`Successfully autofilled the captcha field with: ${captchaCode}`);
  
} else {
  if (!captchaImageElement) {
    console.log("Could not find the captcha image element ('appCaptchaLoginImg').");
  }
  if (!captchaInputElement) {
    console.log("Could not find the captcha input field ('captcha').");
  }
}
