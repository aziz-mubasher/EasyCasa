<#import "template.ftl" as layout>
<@layout.emailLayout>
<p>${msg("ecEmailHello")}</p>
<p>${msg("ecEmailVerifyIntro")}</p>
<p><a href="${link}" style="color:#2c6e9b;">${msg("ecEmailVerifyAction")}</a></p>
<p>${msg("ecEmailExpiry", linkExpiration)}</p>
</@layout.emailLayout>
