<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>
    <#if section = "header">
        ${msg("termsTitle")}
    <#elseif section = "lead">
        ${msg("ecTermsToggle")}
    <#elseif section = "form">
        <div id="kc-terms-text" class="ec-terms-read is-open">
            ${msg("termsText")?no_esc}
        </div>
        <form class="form-actions" action="${url.loginAction}" method="POST">
            <div id="kc-form-buttons" class="${properties.kcFormButtonsClass!}">
                <input class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!}"
                       name="accept" id="kc-accept" type="submit" value="${msg("doAccept")}"/>
                <input class="${properties.kcButtonClass!} ${properties.kcButtonDefaultClass!} ${properties.kcButtonBlockClass!}"
                       name="cancel" id="kc-decline" type="submit" value="${msg("doDecline")}"/>
            </div>
        </form>
    </#if>
</@layout.registrationLayout>
