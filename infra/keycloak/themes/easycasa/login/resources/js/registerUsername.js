/* global document */
/**
 * The easycasa user profile lets only admins edit username, so the
 * registration form does not render that field. Keycloak still rejects
 * the create when username is absent, and the theme used to hide that
 * error. New accounts use the e-mail as username without turning on
 * realm "email as username" (that flag changes login for existing users).
 */
const form = document.getElementById('kc-register-form');
const email = document.getElementById('email');
const username = document.getElementById('username');

const syncUsernameFromEmail = () => {
    if (!email || !username || username.type !== 'hidden') {
        return;
    }
    username.value = email.value.trim();
};

if (form && email && username && username.type === 'hidden') {
    email.addEventListener('input', syncUsernameFromEmail);
    email.addEventListener('change', syncUsernameFromEmail);
    form.addEventListener('submit', syncUsernameFromEmail);
}
