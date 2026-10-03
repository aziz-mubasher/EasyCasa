<#import "template.ftl" as layout>
<#import "user-profile-commons.ftl" as userProfileCommons>
<#-- Banner for errors that are not already printed under a visible field.
     Username is one of those: the profile hides it, but a missing or rejected
     username used to redisplay this form with no message at all. -->
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('email','firstName','lastName','password','password-confirm','username') displayRequiredFields=false displayInfo=true; section>
    <#if section = "header">
        <#if messageHeader??>
            ${kcSanitize(msg("${messageHeader}"))?no_esc}
        <#else>
            ${msg("registerTitle")}
        </#if>
    <#elseif section = "lead">
        ${msg("ecRegisterLead")}
    <#elseif section = "form">
        <form id="kc-register-form" class="${properties.kcFormClass!}" action="${url.registrationAction}" method="post">

            <#-- Password pair is hooked to username (stock) or email-as-username.
                 Username is admin-edit only on easycasa, so neither hook fires
                 unless we also treat a plain email field as the hook.
                 The same profile omits username from the form. The realm still
                 requires one, and registrationEmailAsUsername stays off so
                 existing non-email usernames can log in. Copy email → username
                 on submit; without that the form redisplays and looks like a no-op. -->
            <#assign passwordFieldsRendered = false>
            <#assign usernameSubmitted = false>
            <@userProfileCommons.userProfileFormFields; callback, attribute>
                <#if callback = "beforeField">
                    <#if attribute.name == "username" && !(attribute.readOnly!false)>
                        <#assign usernameSubmitted = true>
                    </#if>
                <#elseif callback = "afterField">
                    <#if passwordRequired?? && !passwordFieldsRendered && (attribute.name == 'username' || attribute.name == 'email')>
                        <#assign passwordFieldsRendered = true>
                        <div class="${properties.kcFormGroupClass!}">
                            <div class="${properties.kcLabelWrapperClass!}">
                                <label for="password" class="${properties.kcLabelClass!}">${msg("password")}</label> *
                            </div>
                            <div class="${properties.kcInputWrapperClass!}">
                                <div class="${properties.kcInputGroup!}" dir="ltr">
                                    <input type="password" id="password" class="${properties.kcInputClass!}" name="password"
                                           autocomplete="new-password"
                                           aria-invalid="<#if messagesPerField.existsError('password','password-confirm')>true</#if>"
                                    />
                                    <button class="${properties.kcFormPasswordVisibilityButtonClass!}" type="button" aria-label="${msg('showPassword')}"
                                            aria-controls="password" data-password-toggle
                                            data-icon-show="${properties.kcFormPasswordVisibilityIconShow!}" data-icon-hide="${properties.kcFormPasswordVisibilityIconHide!}"
                                            data-label-show="${msg('showPassword')}" data-label-hide="${msg('hidePassword')}">
                                        <i class="${properties.kcFormPasswordVisibilityIconShow!}" aria-hidden="true"></i>
                                    </button>
                                </div>
                                <#if messagesPerField.existsError('password')>
                                    <span id="input-error-password" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                                        ${kcSanitize(messagesPerField.get('password'))?no_esc}
                                    </span>
                                </#if>
                            </div>
                        </div>

                        <div class="${properties.kcFormGroupClass!}">
                            <div class="${properties.kcLabelWrapperClass!}">
                                <label for="password-confirm" class="${properties.kcLabelClass!}">${msg("passwordConfirm")}</label> *
                            </div>
                            <div class="${properties.kcInputWrapperClass!}">
                                <div class="${properties.kcInputGroup!}" dir="ltr">
                                    <input type="password" id="password-confirm" class="${properties.kcInputClass!}"
                                           name="password-confirm" autocomplete="new-password"
                                           aria-invalid="<#if messagesPerField.existsError('password-confirm')>true</#if>"
                                    />
                                    <button class="${properties.kcFormPasswordVisibilityButtonClass!}" type="button" aria-label="${msg('showPassword')}"
                                            aria-controls="password-confirm" data-password-toggle
                                            data-icon-show="${properties.kcFormPasswordVisibilityIconShow!}" data-icon-hide="${properties.kcFormPasswordVisibilityIconHide!}"
                                            data-label-show="${msg('showPassword')}" data-label-hide="${msg('hidePassword')}">
                                        <i class="${properties.kcFormPasswordVisibilityIconShow!}" aria-hidden="true"></i>
                                    </button>
                                </div>
                                <#if messagesPerField.existsError('password-confirm')>
                                    <span id="input-error-password-confirm" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                                        ${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}
                                    </span>
                                </#if>
                            </div>
                        </div>
                    </#if>
                </#if>
            </@userProfileCommons.userProfileFormFields>

            <#if !usernameSubmitted>
                <input type="hidden" id="username" name="username" value="" autocomplete="off" />
                <#if messagesPerField.existsError('username')>
                    <span id="input-error-username" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                        ${kcSanitize(messagesPerField.get('username'))?no_esc}
                    </span>
                </#if>
            </#if>

            <div class="ec-terms" id="ec-terms">
                <details class="ec-terms-read">
                    <summary>${msg("ecTermsToggle")}</summary>
                    <p>${msg("termsText")?no_esc}</p>
                    <p>
                        <a href="${properties.ecSiteOrigin!'https://easycasaita.com'}/<#if realm.internationalizationEnabled && locale?? && locale.currentLanguageTag?has_content>${locale.currentLanguageTag}<#else>it</#if>${properties.ecTermsPath!'/legal/terms'}">${msg("ecTermsLink")}</a>
                        ·
                        <a href="${properties.ecSiteOrigin!'https://easycasaita.com'}/<#if realm.internationalizationEnabled && locale?? && locale.currentLanguageTag?has_content>${locale.currentLanguageTag}<#else>it</#if>${properties.ecPrivacyPath!'/legal/privacy'}">${msg("ecPrivacyLink")}</a>
                    </p>
                </details>
                <label class="ec-terms-accept" for="termsAccepted">
                    <input type="checkbox" id="termsAccepted" name="termsAccepted" value="on" required
                           aria-invalid="<#if messagesPerField.existsError('termsAccepted')>true</#if>">
                    <span>${msg("acceptTerms")}</span>
                </label>
                <#if messagesPerField.existsError('termsAccepted')>
                    <span class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                        ${kcSanitize(messagesPerField.get('termsAccepted'))?no_esc}
                    </span>
                </#if>
            </div>

            <div class="${properties.kcFormGroupClass!}">
                <div id="kc-form-buttons" class="${properties.kcFormButtonsClass!}">
                    <input class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}" type="submit" value="${msg("doRegister")}"/>
                </div>
            </div>
        </form>
        <script type="module" src="${url.resourcesPath}/js/passwordVisibility.js"></script>
        <#if !usernameSubmitted>
            <script type="module" src="${url.resourcesPath}/js/registerUsername.js"></script>
        </#if>
    <#elseif section = "info">
        <span>${msg("ecHaveAccount")} <a href="${url.loginUrl}">${msg("doLogIn")}</a></span>
    </#if>
</@layout.registrationLayout>
