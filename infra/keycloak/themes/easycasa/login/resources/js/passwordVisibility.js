/* global document */
const toggle = (button) => {
    const passwordElement = document.getElementById(button.getAttribute('aria-controls'));
    if (!passwordElement) {
        return;
    }
    if (passwordElement.type === "password") {
        passwordElement.type = "text";
        const icon = button.children.item(0);
        if (icon) {
            icon.className = button.dataset.iconHide;
        }
        button.setAttribute("aria-label", button.dataset.labelHide);
    } else if (passwordElement.type === "text") {
        passwordElement.type = "password";
        const icon = button.children.item(0);
        if (icon) {
            icon.className = button.dataset.iconShow;
        }
        button.setAttribute("aria-label", button.dataset.labelShow);
    }
};

document.querySelectorAll('[data-password-toggle]')
    .forEach((button) => {
        button.addEventListener('click', () => toggle(button));
    });
