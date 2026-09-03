<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<#assign langTag = "it">
<#if realm.internationalizationEnabled && locale?? && locale.currentLanguageTag?has_content>
    <#assign langTag = locale.currentLanguageTag>
</#if>
<#assign siteOrigin = properties.ecSiteOrigin!'https://easycasaita.com'>
<#assign legendaOrigin = properties.ecLegendaOrigin!'https://legenda.easycasaita.com'>
<#assign legendaUrl = legendaOrigin + "/" + langTag>
<#assign privacyUrl = siteOrigin + "/" + langTag + (properties.ecPrivacyPath!'/legal/privacy')>
<#assign termsUrl = siteOrigin + "/" + langTag + (properties.ecTermsPath!'/legal/terms')>
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
    <link rel="icon" href="${url.resourcesPath}/img/favicon.svg" type="image/svg+xml">
    <link rel="icon" href="${url.resourcesPath}/img/favicon.png" sizes="32x32" type="image/png">
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
</head>
<body class="${properties.kcBodyClass!} ${bodyClass}">
<div class="${properties.kcLoginClass!}">
    <header id="kc-header" class="${properties.kcHeaderClass!}">
        <a class="${properties.kcHeaderWrapperClass!}" href="${legendaUrl}" aria-label="${msg("ecBrandAria")}">
            <img class="ec-logo-mark" src="${url.resourcesPath}/img/logo.svg" alt="" width="40" height="40">
            <span class="ec-wordmark-stack">
                <span class="ec-wordmark">Easy<span>Casa</span></span>
                <span class="ec-wordmark-sub">${msg("ecBrandKicker")}</span>
            </span>
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
                <p class="ec-lead"><#nested "lead"></p>
            <#else>
                <#nested "show-username">
                <div id="kc-username" class="${properties.kcFormGroupClass!}">
                    <p class="ec-attempted">${auth.attemptedUsername}</p>
                    <a id="reset-login" class="ec-restart" href="${url.loginRestartFlowUrl}">${msg("restartLoginTooltip")}</a>
                </div>
                <h1 id="kc-page-title"><#nested "header"></h1>
                <p class="ec-lead"><#nested "lead"></p>
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
        </div>
    </main>
</div>
</body>
</html>
</#macro>
