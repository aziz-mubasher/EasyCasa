<#import "template.ftl" as layout>
<@layout.emailLayout>
<p>${msg("ecEmailHello")}</p>
<p>${msg("ecEmailResetIntro")}</p>
<p><a href="${link}" style="color:#2c6e9b;">${msg("ecEmailResetAction")}</a></p>
<p>${msg("ecEmailExpiry", linkExpiration)}</p>
</@layout.emailLayout>
