# WhatsApp templates — EC-WA-INTAKE-2 v1.1

AZM pastes each block into WhatsApp Manager. Category is UTILITY. There are no buttons. The customer replies by typing.

AZM approved these languages on 10 Nov 2026. A template is sent only after the API reads that locale as APPROVED on `WHATSAPP_WABA_ID`. If the customer locale is not approved, English is used when English is approved. Otherwise nothing is sent and the desk shows “template not approved in this language”. The corpus `review` field stays `draft`; Meta status is the send gate.

Footer on every template: `Easy Casa Italia · Easy Legenda`.

`ec_call_confirmed` variable {{2}} is `call_language_names[customer_locale][call_language]`. The example below uses Italian as the call language.

## ec_request_followup · en

```
name: ec_request_followup
category: UTILITY
language: en
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
Hello, this is {{1}} from Ayni Group Italia. We are following up on your WhatsApp request about: {{2}}. Reply to this message and we will continue here.
example:
  {{1}}: Giulia
  {{2}}: Buy a home
```

## ec_request_followup · it

```
name: ec_request_followup
category: UTILITY
language: it
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
Buongiorno, sono {{1}} di Ayni Group Italia. La ricontattiamo per la Sua richiesta WhatsApp su: {{2}}. Risponda a questo messaggio e proseguiamo qui.
example:
  {{1}}: Giulia
  {{2}}: Comprare casa
```

## ec_request_followup · es

```
name: ec_request_followup
category: UTILITY
language: es
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
Hola, soy {{1}} de Ayni Group Italia. Le escribimos sobre su solicitud por WhatsApp: {{2}}. Responda a este mensaje y seguimos aquí.
example:
  {{1}}: Giulia
  {{2}}: Comprar vivienda
```

## ec_request_followup · hi

```
name: ec_request_followup
category: UTILITY
language: hi
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
नमस्ते, मैं Ayni Group Italia से {{1}} हूँ। हम आपके WhatsApp अनुरोध के बारे में संपर्क कर रहे हैं: {{2}}। इस संदेश का जवाब दें, हम यहीं बात आगे बढ़ाएँगे।
example:
  {{1}}: Giulia
  {{2}}: घर खरीदना
```

## ec_request_followup · ur

```
name: ec_request_followup
category: UTILITY
language: ur
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
السلام علیکم، میں Ayni Group Italia سے {{1}} ہوں۔ ہم آپ کی WhatsApp درخواست کے بارے میں رابطہ کر رہے ہیں: {{2}}۔ اس پیغام کا جواب دیں، ہم یہیں بات آگے بڑھائیں گے۔
example:
  {{1}}: Giulia
  {{2}}: گھر خریدنا
```

## ec_request_followup · pa

```
name: ec_request_followup
category: UTILITY
language: pa
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
السلام علیکم، میں Ayni Group Italia توں {{1}} آں۔ اسیں تہاڈی WhatsApp درخواست بارے رابطہ کر رہے آں: {{2}}۔ ایس سنیہے دا جواب دیو، اسیں ایتھے ای گل اگے ودھاواں گے۔
example:
  {{1}}: Giulia
  {{2}}: گھر خریدنا
```

## ec_request_followup · bn

```
name: ec_request_followup
category: UTILITY
language: bn
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
হ্যালো, আমি Ayni Group Italia থেকে {{1}}। আপনার WhatsApp অনুরোধ নিয়ে যোগাযোগ করছি: {{2}}। এই বার্তার উত্তর দিন, আমরা এখানেই কথা চালিয়ে যাব।
example:
  {{1}}: Giulia
  {{2}}: বাড়ি কেনা
```

## ec_request_followup · ar

```
name: ec_request_followup
category: UTILITY
language: ar
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
مرحباً، معك {{1}} من Ayni Group Italia. نتواصل معك بخصوص طلبك عبر واتساب: {{2}}. رُدّ على هذه الرسالة لنتابع هنا.
example:
  {{1}}: Giulia
  {{2}}: شراء منزل
```

## ec_call_confirmed · en

```
name: ec_call_confirmed
category: UTILITY
language: en
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
Your call with Ayni Group Italia is confirmed for {{1}} (Italian time), in {{2}}. If you can no longer make it, reply to this message.
example:
  {{1}}: Thursday 12 November, 10:30
  {{2}}: Italian
```

## ec_call_confirmed · it

```
name: ec_call_confirmed
category: UTILITY
language: it
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
La Sua chiamata con Ayni Group Italia è confermata per {{1}} (ora italiana), in {{2}}. Se non può più partecipare, risponda a questo messaggio.
example:
  {{1}}: giovedì 12 novembre, 10:30
  {{2}}: italiano
```

## ec_call_confirmed · es

```
name: ec_call_confirmed
category: UTILITY
language: es
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
Su llamada con Ayni Group Italia está confirmada para {{1}} (hora italiana), en {{2}}. Si ya no puede, responda a este mensaje.
example:
  {{1}}: jueves 12 de noviembre, 10:30
  {{2}}: italiano
```

## ec_call_confirmed · hi

```
name: ec_call_confirmed
category: UTILITY
language: hi
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
Ayni Group Italia के साथ आपकी कॉल {{1}} (इटली का समय) के लिए पक्की है, भाषा: {{2}}। अगर आप नहीं आ सकते, तो इस संदेश का जवाब दें।
example:
  {{1}}: गुरुवार 12 नवम्बर, 10:30
  {{2}}: इतालवी
```

## ec_call_confirmed · ur

```
name: ec_call_confirmed
category: UTILITY
language: ur
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
Ayni Group Italia کے ساتھ آپ کی کال {{1}} (اٹلی کا وقت) کے لیے طے ہے، زبان: {{2}}۔ اگر آپ نہیں آ سکتے تو اس پیغام کا جواب دیں۔
example:
  {{1}}: جمعرات 12 نومبر، 10:30
  {{2}}: اطالوی
```

## ec_call_confirmed · pa

```
name: ec_call_confirmed
category: UTILITY
language: pa
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
Ayni Group Italia نال تہاڈی کال {{1}} (اٹلی دا ویلا) لئی پکی اے، زبان: {{2}}۔ جے تسی نئیں آ سکدے تے ایس سنیہے دا جواب دیو۔
example:
  {{1}}: جمعرات 12 نومبر، 10:30
  {{2}}: اطالوی
```

## ec_call_confirmed · bn

```
name: ec_call_confirmed
category: UTILITY
language: bn
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
Ayni Group Italia-র সাথে আপনার কল {{1}} (ইতালির সময়) নিশ্চিত হয়েছে, ভাষা: {{2}}। আসতে না পারলে এই বার্তার উত্তর দিন।
example:
  {{1}}: বৃহস্পতিবার ১২ নভেম্বর, ১০:৩০
  {{2}}: ইতালীয়
```

## ec_call_confirmed · ar

```
name: ec_call_confirmed
category: UTILITY
language: ar
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
تم تأكيد مكالمتك مع Ayni Group Italia في {{1}} (بتوقيت إيطاليا)، باللغة {{2}}. إذا لم تعد تستطيع الحضور، رُدّ على هذه الرسالة.
example:
  {{1}}: الخميس 12 نوفمبر، 10:30
  {{2}}: الإيطالية
```

## ec_call_not_possible · en

```
name: ec_call_not_possible
category: UTILITY
language: en
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
We are sorry, we cannot hold the call planned for {{1}}. We can offer {{2}} (Italian time). Reply OK to accept, or tell us another time.
example:
  {{1}}: Thursday 12 November, 10:30
  {{2}}: Friday 13 November, 11:00
```

## ec_call_not_possible · it

```
name: ec_call_not_possible
category: UTILITY
language: it
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
Ci dispiace, non possiamo fare la chiamata prevista per {{1}}. Possiamo proporLe {{2}} (ora italiana). Risponda OK per accettare, oppure ci indichi un altro orario.
example:
  {{1}}: giovedì 12 novembre, 10:30
  {{2}}: venerdì 13 novembre, 11:00
```

## ec_call_not_possible · es

```
name: ec_call_not_possible
category: UTILITY
language: es
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
Lo sentimos, no podemos hacer la llamada prevista para {{1}}. Le proponemos {{2}} (hora italiana). Responda OK para aceptar o indíquenos otra hora.
example:
  {{1}}: jueves 12 de noviembre, 10:30
  {{2}}: viernes 13 de noviembre, 11:00
```

## ec_call_not_possible · hi

```
name: ec_call_not_possible
category: UTILITY
language: hi
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
क्षमा करें, {{1}} वाली कॉल हम नहीं कर पाएँगे। हम {{2}} (इटली का समय) का समय दे सकते हैं। स्वीकार करने के लिए OK लिखें, या कोई दूसरा समय बताएँ।
example:
  {{1}}: गुरुवार 12 नवम्बर, 10:30
  {{2}}: शुक्रवार 13 नवम्बर, 11:00
```

## ec_call_not_possible · ur

```
name: ec_call_not_possible
category: UTILITY
language: ur
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
معذرت، {{1}} والی کال ہم نہیں کر سکیں گے۔ ہم {{2}} (اٹلی کا وقت) پیش کر سکتے ہیں۔ قبول کرنے کے لیے OK لکھیں، یا کوئی اور وقت بتائیں۔
example:
  {{1}}: جمعرات 12 نومبر، 10:30
  {{2}}: جمعہ 13 نومبر، 11:00
```

## ec_call_not_possible · pa

```
name: ec_call_not_possible
category: UTILITY
language: pa
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
معاف کرنا، {{1}} والی کال اسیں نئیں کر سکاں گے۔ اسیں {{2}} (اٹلی دا ویلا) دے سکدے آں۔ منن لئی OK لکھو، یا کوئی ہور ویلا دسو۔
example:
  {{1}}: جمعرات 12 نومبر، 10:30
  {{2}}: جمعہ 13 نومبر، 11:00
```

## ec_call_not_possible · bn

```
name: ec_call_not_possible
category: UTILITY
language: bn
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
দুঃখিত, {{1}}-এর কলটি আমরা করতে পারব না। আমরা {{2}} (ইতালির সময়) প্রস্তাব করছি। রাজি থাকলে OK লিখুন, অথবা অন্য সময় জানান।
example:
  {{1}}: বৃহস্পতিবার ১২ নভেম্বর, ১০:৩০
  {{2}}: শুক্রবার ১৩ নভেম্বর, ১১:০০
```

## ec_call_not_possible · ar

```
name: ec_call_not_possible
category: UTILITY
language: ar
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
نعتذر، لا يمكننا إجراء المكالمة المحددة في {{1}}. نقترح {{2}} (بتوقيت إيطاليا). اكتب OK للموافقة، أو أخبرنا بموعد آخر.
example:
  {{1}}: الخميس 12 نوفمبر، 10:30
  {{2}}: الجمعة 13 نوفمبر، 11:00
```

## ec_call_reminder · en

```
name: ec_call_reminder
category: UTILITY
language: en
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
Reminder: your call with Ayni Group Italia is today at {{1}} (Italian time). If you can no longer make it, reply to this message.
example:
  {{1}}: 10:30
```

## ec_call_reminder · it

```
name: ec_call_reminder
category: UTILITY
language: it
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
Promemoria: la Sua chiamata con Ayni Group Italia è oggi alle {{1}} (ora italiana). Se non può più partecipare, risponda a questo messaggio.
example:
  {{1}}: 10:30
```

## ec_call_reminder · es

```
name: ec_call_reminder
category: UTILITY
language: es
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
Recordatorio: su llamada con Ayni Group Italia es hoy a las {{1}} (hora italiana). Si ya no puede, responda a este mensaje.
example:
  {{1}}: 10:30
```

## ec_call_reminder · hi

```
name: ec_call_reminder
category: UTILITY
language: hi
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
याद दिलाना: Ayni Group Italia के साथ आपकी कॉल आज {{1}} बजे (इटली का समय) है। अगर आप नहीं आ सकते, तो इस संदेश का जवाब दें।
example:
  {{1}}: 10:30
```

## ec_call_reminder · ur

```
name: ec_call_reminder
category: UTILITY
language: ur
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
یاد دہانی: Ayni Group Italia کے ساتھ آپ کی کال آج {{1}} بجے (اٹلی کا وقت) ہے۔ اگر آپ نہیں آ سکتے تو اس پیغام کا جواب دیں۔
example:
  {{1}}: 10:30
```

## ec_call_reminder · pa

```
name: ec_call_reminder
category: UTILITY
language: pa
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
یاد دہانی: Ayni Group Italia نال تہاڈی کال اج {{1}} وجے (اٹلی دا ویلا) اے۔ جے تسی نئیں آ سکدے تے ایس سنیہے دا جواب دیو۔
example:
  {{1}}: 10:30
```

## ec_call_reminder · bn

```
name: ec_call_reminder
category: UTILITY
language: bn
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
মনে করিয়ে দিচ্ছি: Ayni Group Italia-র সাথে আপনার কল আজ {{1}}-এ (ইতালির সময়)। আসতে না পারলে এই বার্তার উত্তর দিন।
example:
  {{1}}: ১০:৩০
```

## ec_call_reminder · ar

```
name: ec_call_reminder
category: UTILITY
language: ar
buttons: none
footer: Easy Casa Italia · Easy Legenda
body:
تذكير: مكالمتك مع Ayni Group Italia اليوم الساعة {{1}} (بتوقيت إيطاليا). إذا لم تعد تستطيع الحضور، رُدّ على هذه الرسالة.
example:
  {{1}}: 10:30
```
