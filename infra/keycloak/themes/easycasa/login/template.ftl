<#import "footer.ftl" as loginFooter>
<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<#assign langTag = "it">
<#if realm.internationalizationEnabled && locale?? && locale.currentLanguageTag?has_content>
    <#assign langTag = locale.currentLanguageTag>
</#if>
<#assign siteOrigin = properties.ecSiteOrigin!'https://easycasaita.com'>
<#assign privacyUrl = siteOrigin + "/" + langTag + (properties.ecPrivacyPath!'/legal/privacy')>
<#assign termsUrl = siteOrigin + "/" + langTag + (properties.ecTermsPath!'/legal/terms')>
<#assign cookieUrl = siteOrigin + "/" + langTag + (properties.ecCookiePath!'/legal/privacy')>
<!DOCTYPE html>
<html class="${properties.kcHtmlClass!}" lang="${langTag}" dir="ltr">
<head>
    <meta charset="utf-8">
    <meta name="robots" content="noindex, nofollow">
    <#if properties.meta?has_content>
        <#list properties.meta?split(' ') as meta>
            <meta name="${meta?split('==')[0]}" content="${meta?split('==')[1]}"/>
        </#list>
    </#if>
    <title>${msg("loginTitle",(realm.displayName!''))}</title>
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
</head>
<body class="${properties.kcBodyClass!} ${bodyClass}">
<div class="${properties.kcLoginClass!}">
    <header id="kc-header" class="${properties.kcHeaderClass!}">
        <a class="${properties.kcHeaderWrapperClass!}" href="${siteOrigin}/${langTag}">
            <span class="ec-wordmark">Easy<span>Casa</span></span>
            <span class="ec-wordmark-sub">${msg("ecBrandKicker")}</span>
        </a>
    </header>

    <main class="${properties.kcFormCardClass!}" id="kc-container">
        <header class="${properties.kcFormHeaderClass!}">
            <#if realm.internationalizationEnabled && locale.supported?size gt 1>
                <nav class="${properties.kcLocaleMainClass!}" id="kc-locale" aria-label="${msg("languages")}">
                    <ul class="${properties.kcLocaleListClass!}">
                        <#list locale.supported as l>
                            <li class="${properties.kcLocaleListItemClass!}">
                                <a class="${properties.kcLocaleItemClass!}<#if l.languageTag == langTag> is-active</#if>"
                                   href="${l.url}"
                                   hreflang="${l.languageTag}"
                                   lang="${l.languageTag}"
                                   <#if l.languageTag == langTag>aria-current="true"</#if>>${l.label}</a>
                            </li>
                        </#list>
                    </ul>
                </nav>
            </#if>

            <#if !(auth?has_content && auth.showUsername() && !auth.showResetCredentials())>
                <#if displayRequiredFields>
                    <p class="ec-required-note"><span aria-hidden="true">*</span> ${msg("requiredFields")}</p>
                </#if>
                <h1 id="kc-page-title"><#nested "header"></h1>
            <#else>
                <#nested "show-username">
                <div id="kc-username" class="${properties.kcFormGroupClass!}">
                    <p class="ec-attempted">${auth.attemptedUsername}</p>
                    <a id="reset-login" class="ec-restart" href="${url.loginRestartFlowUrl}">${msg("restartLoginTooltip")}</a>
                </div>
                <h1 id="kc-page-title"><#nested "header"></h1>
            </#if>
        </header>

        <div id="kc-content">
            <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
                <div class="${properties.kcAlertClass!} ec-alert-${message.type}" role="<#if message.type = 'error'>alert<#else>status</#if>">
                    <p class="${properties.kcAlertTitleClass!}">${kcSanitize(message.summary)?no_esc}</p>
                </div>
            </#if>

            <#nested "form">

            <#if auth?has_content && auth.showTryAnotherWayLink()>
                <form id="kc-select-try-another-way-form" action="${url.loginAction}" method="post">
                    <div class="${properties.kcFormGroupClass!}">
                        <input type="hidden" name="tryAnotherWay" value="on"/>
                        <button type="submit" class="ec-linkish" id="try-another-way">${msg("doTryAnotherWay")}</button>
                    </div>
                </form>
            </#if>

            <#nested "socialProviders">

            <#if displayInfo>
                <div id="kc-info" class="${properties.kcSignUpClass!}">
                    <div id="kc-info-wrapper" class="${properties.kcInfoAreaWrapperClass!}">
                        <#nested "info">
                    </div>
                </div>
            </#if>

            <#nested "ec-art13">
        </div>

        <footer class="ec-legal" id="ec-legal">
            <p class="ec-legal-controller">${msg("ecController")}</p>
            <p class="ec-legal-footer">${msg("ecLegalFooter")}</p>
            <p class="ec-legal-links">
                <a href="${privacyUrl}">${msg("ecPrivacyLink")}</a>
                <a href="${termsUrl}">${msg("ecTermsLink")}</a>
                <a href="${cookieUrl}">${msg("ecCookieLink")}</a>
            </p>
            <p class="ec-legal-meta">${msg("ecPolicyStamp")} ${properties.ecPolicyVersion!}</p>
        </footer>
        <@loginFooter.content/>
    </main>
</div>
</body>
</html>
</#macro>
