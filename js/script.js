document.addEventListener('DOMContentLoaded', () => {
    const typedElement = document.querySelector('.typed');
    const textData = typedElement ? typedElement.dataset.text.split('|') : [];
    const typingSpeed = 80;
    const pauseTime = 1400;

    let currentText = '';
    let currentIndex = 0;
    let charIndex = 0;
    let deleting = false;

    function updateText() {
        const fullText = textData[currentIndex] || '';
        if (!deleting) {
            currentText = fullText.slice(0, charIndex + 1);
            charIndex++;
            if (charIndex === fullText.length) {
                deleting = true;
                setTimeout(updateText, pauseTime);
                return;
            }
        } else {
            currentText = fullText.slice(0, charIndex - 1);
            charIndex--;
            if (charIndex === 0) {
                deleting = false;
                currentIndex = (currentIndex + 1) % textData.length;
            }
        }

        typedElement.textContent = currentText;
        setTimeout(updateText, deleting ? typingSpeed / 2 : typingSpeed);
    }

    if (typedElement && textData.length) {
        updateText();
    }
});