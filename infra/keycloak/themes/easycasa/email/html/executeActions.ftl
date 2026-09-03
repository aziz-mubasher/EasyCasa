<#import "template.ftl" as layout>
<@layout.emailLayout>
<p>${msg("ecEmailHello")}</p>
<p>${msg("ecEmailActionsIntro")}</p>
<p><a href="${link}" style="color:#2c6e9b;">${msg("ecEmailActionsAction")}</a></p>
<p>${msg("ecEmailExpiry", linkExpiration)}</p>
</@layout.emailLayout>
