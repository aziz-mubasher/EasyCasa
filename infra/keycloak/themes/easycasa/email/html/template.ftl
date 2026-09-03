<#macro emailLayout>
<!DOCTYPE html>
<html lang="<#if locale?? && locale.currentLanguageTag?has_content>${locale.currentLanguageTag}<#else>it</#if>">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>EasyCasa</title>
</head>
<body style="margin:0;padding:0;background:#f3ede1;color:#14212e;font-family:ui-serif,Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3ede1;padding:24px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#e8dfcc;border:1px solid rgba(20,33,46,0.34);padding:24px;">
                    <tr>
                        <td style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:22px;font-weight:700;letter-spacing:-0.03em;">
                            Easy<span style="color:#2c6e9b;">Casa</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding-top:16px;font-size:16px;line-height:1.6;">
                            <#nested>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding-top:20px;border-top:1px solid rgba(20,33,46,0.16);font-size:13px;line-height:1.55;color:#4c5d6e;">
                            <p style="margin:0 0 8px;">${msg("ecController")}</p>
                            <p style="margin:0 0 8px;">${msg("ecEmailLegal")}</p>
                            <p style="margin:0;">${msg("ecEmailUnsub")}</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
</#macro>
